import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col lg:flex-row items-center justify-between">
          <div className="lg:w-1/2 mb-8 lg:mb-0">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Track Your Impact, <br />
              <span className="text-green-600">Save the Planet</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Join GreenGuardian to visualize your environmental footprint, participate in local swap challenges, and build a sustainable future together.
            </p>
            <div className="flex gap-4">
              <Link 
                href="/signup"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Get Started
              </Link>
              <Link 
                href="/login"
                className="px-6 py-3 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
          <div className="lg:w-1/2">
            {/* Replace with your actual hero image */}
            <div className="relative h-[400px] w-full">
              <Image
                src="/hero.png"
                alt="Environmental Impact Visualization"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How GreenGuardian Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Track Impact',
                description: 'Scan product barcodes to learn their environmental impact and water consumption.',
                icon: '🔍'
              },
              {
                title: 'Swap Smart',
                description: 'Join local swap challenges to give items new life instead of throwing them away.',
                icon: '🔄'
              },
              {
                title: 'Earn Rewards',
                description: 'Collect badges and track your community collective environmental impact.',
                icon: '🏆'
              }
            ].map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-lg bg-green-50">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-green-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Make a Difference?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of eco-conscious individuals creating a sustainable future.
          </p>
          <Link 
            href="/signup"
            className="px-8 py-4 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors inline-block"
          >
            Join GreenGuardian Today
          </Link>
        </div>
      </div>
    </div>
  );
}
