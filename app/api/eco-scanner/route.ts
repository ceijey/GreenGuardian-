import { NextResponse } from 'next/server';
import { analyzeWasteWithGemini, isGeminiAvailable } from '@/lib/gemini';
import { getRedisClient } from '@/lib/redis';

interface EcoScannerRequest {
  image?: string; // Base64 image data
  code?: string; // Barcode (legacy support)
  useFallback?: boolean; // Force use of fallback
  checkAvailability?: boolean; // Check if Gemini is available
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EcoScannerRequest;
    const { image, code, useFallback, checkAvailability } = body;

    // Check availability endpoint
    if (checkAvailability) {
      const available = isGeminiAvailable();
      console.log('🔍 Gemini availability check:', available);
      return NextResponse.json({
        available,
        message: available ? 'Gemini AI is ready' : 'GEMINI_API_KEY not configured',
      }, { status: 200 });
    }

    // Method 1: Gemini AI Image Analysis (PRIMARY)
    if (image && !useFallback && isGeminiAvailable()) {
      try {
        console.log('🤖 Using Gemini AI for waste analysis...');
        console.log('📸 Image data length:', image.length);
        console.log('📸 Image prefix:', image.substring(0, 50));

        // Create cache key based on image hash
        const crypto = await import('crypto');
        const imageHash = crypto.default.createHash('md5').update(image).digest('hex');
        const cacheKey = `eco-scanner:gemini:${imageHash}`;

        // Check cache first
        const redis = getRedisClient();
        try {
          const cachedResult = await redis.get(cacheKey);
          if (cachedResult) {
            console.log('✅ Cache hit for Gemini analysis');
            const parsedResult = JSON.parse(cachedResult);
            return NextResponse.json({
              success: true,
              method: 'gemini-ai-cached',
              result: parsedResult,
            }, { status: 200 });
          }
        } catch (cacheError) {
          console.warn('⚠️ Redis cache error:', cacheError);
          // Continue without cache
        }

        const result = await analyzeWasteWithGemini(image);

        console.log('✅ Gemini analysis complete:', result.category);

        // Cache the result for 1 hour (3600 seconds)
        try {
          await redis.setex(cacheKey, 3600, JSON.stringify(result));
          console.log('💾 Cached Gemini result');
        } catch (cacheError) {
          console.warn('⚠️ Failed to cache result:', cacheError);
        }

        return NextResponse.json({
          success: true,
          method: 'gemini-ai',
          result,
        }, { status: 200 });
      } catch (geminiError) {
        console.error('❌ Gemini AI failed:', geminiError);
        // Fall through to TensorFlow fallback
      }
    }

    // Method 2: TensorFlow.js Fallback (BACKUP)
    if (image) {
      console.log('⚡ Using TensorFlow.js fallback...');

      // Return a flag to trigger client-side TensorFlow
      return NextResponse.json({
        success: true,
        method: 'tensorflow-fallback',
        message: 'Please use client-side TensorFlow.js for analysis',
        useTensorFlow: true,
      }, { status: 200 });
    }

    // Method 3: Barcode Lookup (LEGACY)
    if (code) {
      console.log('📊 Using barcode lookup...');
      const ecoDatabase: Record<string, any> = {
        PLASTIC001: {
          category: 'Plastic Bottle',
          recyclable: true,
          instructions: 'Remove cap and label. Rinse before recycling.',
          icon: 'fas fa-recycle',
          color: '#2196F3',
        },
        CAN002: {
          category: 'Aluminum Can',
          recyclable: true,
          instructions: 'Rinse and crush. Place in metal recycling bin.',
          icon: 'fas fa-can-food',
          color: '#9E9E9E',
        },
        PAPER003: {
          category: 'Paper',
          recyclable: true,
          instructions: 'Keep dry. Flatten and place in paper recycling bin.',
          icon: 'fas fa-file-alt',
          color: '#03A9F4',
        },
      };

      const result = ecoDatabase[code];
      if (result) {
        return NextResponse.json({
          success: true,
          method: 'barcode-lookup',
          result,
        }, { status: 200 });
      }

      return NextResponse.json({
        success: false,
        message: '⚠️ Item not recognized in the eco-database.',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      message: 'Please provide an image or barcode.',
    }, { status: 400 });

  } catch (error) {
    console.error('Eco-scanner API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Server error while scanning item.',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
