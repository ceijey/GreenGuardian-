import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini AI client
const apiKey = process.env.GEMINI_API_KEY || '';
console.log('🔍 Gemini API Key check:', apiKey ? `Found (${apiKey.substring(0, 10)}...)` : 'NOT FOUND');
const genAI = new GoogleGenerativeAI(apiKey);

export interface GeminiScanResult {
  category: string;
  confidence: number;
  recyclable: boolean;
  instructions: string;
  materialType: string;
  ecoRating: number; // 1-5 scale
  alternatives: string[];
  carbonFootprint?: string;
  icon: string;
  color: string;
}

/**
 * Analyze waste/product image using Gemini AI
 */
export async function analyzeWasteWithGemini(
  imageData: string
): Promise<GeminiScanResult> {
  try {
    console.log('🔍 Gemini: Starting analysis...');
    console.log('🔍 Image data length:', imageData.length);
    
    // Using Gemini 2.5 Flash - available in your API tier and supports multimodal
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Analyze this image and identify ONLY recyclable products/waste.
    
    IMPORTANT: Only respond if you detect a recyclable item (plastic bottles, cans, paper, cardboard, glass, electronics, etc.). 
    If you see a person, animal, furniture, or non-recyclable item, respond with: {"category": "Not recyclable", "recyclable": false}
    
    For recyclable items, identify:
    1. What type of recyclable product this is (e.g., "Plastic Bottle", "Aluminum Can", "Paper", "Cardboard Box")
    2. The primary material (plastic, metal, glass, paper, cardboard, e-waste)
    3. Specific recycling instructions
    4. Eco-rating from 1-5 (1=low recyclability, 5=highly recyclable)
    5. Suggest 2-3 eco-friendly alternatives
    6. Carbon footprint - USE THESE EXACT VALUES (do NOT recalculate or estimate):
       - Plastic bottle (500ml or similar): ALWAYS use "82g"
       - Aluminum can: ALWAYS use "170g"
       - Glass bottle: ALWAYS use "200g"
       - Paper (A4 sheet): ALWAYS use "10g"
       - Cardboard box (small): ALWAYS use "150g"
       - Smartphone/Mobile phone: ALWAYS use "55kg"
       - Laptop/Computer: ALWAYS use "270kg"
       - Tablet: ALWAYS use "100kg"
       - Other electronics: use "50kg" to "300kg" based on size
       - Other items: estimate based on material type
    
    CRITICAL: For the carbonFootprint field, you MUST use the EXACT values listed above. Do NOT calculate, estimate, or modify these values.
    
    Respond in JSON format - carbonFootprint examples:
    - For smartphone: "carbonFootprint": "55kg"
    - For plastic bottle: "carbonFootprint": "82g"
    - For aluminum can: "carbonFootprint": "170g"
    
    Example response:
    {
      "category": "Plastic Water Bottle",
      "materialType": "PET Plastic",
      "recyclable": true,
      "confidence": 0.95,
      "instructions": "Remove cap and label. Rinse bottle. Place in recycling bin.",
      "ecoRating": 3,
      "alternatives": ["Reusable stainless steel bottle", "Glass water bottle"],
      "carbonFootprint": "82g"
    }
    
    Remember: Use EXACTLY the carbon values from the list above. Do not recalculate. Only analyze waste/recyclable products - ignore people, pets, and furniture.`;

    console.log('🔍 Gemini: Calling API...');
    
    // Extract base64 data - handle both data URLs and raw base64
    let base64Data = imageData;
    if (imageData.includes(',')) {
      base64Data = imageData.split(',')[1];
      console.log('🔍 Gemini: Extracted base64 from data URL');
    }
    console.log('🔍 Gemini: Base64 data length:', base64Data.length);
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    console.log('🔍 Gemini: Raw response:', text.substring(0, 200));

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Gemini: No JSON found in response');
      throw new Error('Failed to parse Gemini response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('🔍 Gemini: Parsed result:', {
      category: parsed.category,
      recyclable: parsed.recyclable,
      confidence: parsed.confidence
    });

    // Map to our result format with icons and colors
    const iconMap: Record<string, { icon: string; color: string }> = {
      plastic: { icon: 'fas fa-recycle', color: '#2196F3' },
      metal: { icon: 'fas fa-can-food', color: '#9E9E9E' },
      glass: { icon: 'fas fa-wine-bottle', color: '#4CAF50' },
      paper: { icon: 'fas fa-file-alt', color: '#03A9F4' },
      cardboard: { icon: 'fas fa-box', color: '#8D6E63' },
      organic: { icon: 'fas fa-apple-alt', color: '#4CAF50' },
      'e-waste': { icon: 'fas fa-plug', color: '#FF9800' },
      general: { icon: 'fas fa-trash', color: '#F44336' },
    };

    const materialLower = parsed.materialType?.toLowerCase() || 'general';
    const iconData =
      iconMap[Object.keys(iconMap).find((key) => materialLower.includes(key)) || 'general'] ||
      iconMap.general;

    return {
      category: parsed.category || 'Unknown Item',
      confidence: parsed.confidence || 0.8,
      recyclable: parsed.recyclable || false,
      instructions: parsed.instructions || 'No specific instructions available.',
      materialType: parsed.materialType || 'Unknown',
      ecoRating: parsed.ecoRating || 3,
      alternatives: parsed.alternatives || [],
      carbonFootprint: parsed.carbonFootprint,
      icon: iconData.icon,
      color: iconData.color,
    };
  } catch (error) {
    console.error('❌ Gemini AI analysis failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.message.includes('429') || error.message.includes('quota')) {
        console.error('🚫 QUOTA EXCEEDED - API plan upgrade needed');
      }
    }
    throw error;
  }
}

/**
 * Check if Gemini API is available
 */
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
