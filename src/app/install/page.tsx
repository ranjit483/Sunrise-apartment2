import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'

export default function AppInstallPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg overflow-hidden border shadow-sm flex items-center justify-center bg-white">
              <img src="/logo.jpg" alt="Sunrise Logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Sunrise AMS</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">How to Install the Sunrise App</h1>
        <p className="text-lg text-gray-600 mb-8">
          You don't need to visit the App Store or Google Play! We use modern web technology that allows you to install our platform directly to your device from your browser.
        </p>

        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b pb-2">For iOS (iPhone/iPad)</h2>
            <p className="text-sm italic text-gray-500 mb-4">*Note: You must use the Safari browser for this to work.*</p>
            <ol className="list-decimal pl-5 space-y-3 text-gray-700">
              <li>Open <strong>Safari</strong> and navigate (<a href="https://sunrise.onlinenepa.com" className="text-indigo-600 hover:underline">sunrise.onlinenepa.com</a>) to our website.</li>
              <li>Tap the <strong>Share</strong> icon at the bottom of the screen (the square with an arrow pointing up).</li>
              <li>Scroll down the share menu and tap <strong>"Add to Home Screen"</strong>.</li>
              <li>Tap <strong>"Add"</strong> in the top right corner.</li>
              <li className="text-emerald-700 font-medium">Success! The app icon is now on your home screen.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b pb-2">For Android Mobile</h2>
            <p className="text-sm italic text-gray-500 mb-4">*Note: We recommend using the Google Chrome browser.*</p>
            <ol className="list-decimal pl-5 space-y-3 text-gray-700">
              <li>Open <strong>Google Chrome</strong> and navigate (<a href="https://sunrise.onlinenepa.com" className="text-indigo-600 hover:underline">sunrise.onlinenepa.com</a>) to our website.</li>
              <li>You may see a rich installation prompt pop up at the bottom of the screen saying "Install and create shortcut". If so, simply tap it!</li>
              <li>If the prompt doesn't appear automatically, tap the <strong>Three Dots (Menu)</strong> in the top right corner.</li>
              <li>Tap <strong>"Install App"</strong> from the menu.</li>
              <li className="text-emerald-700 font-medium">Success! The native app is now installed on your device.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b pb-2">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">1. Why isn't the app in the Apple App Store or Google Play Store?</h3>
                <p className="text-gray-600">Our app is a Progressive Web App (PWA). This means it works directly through your browser using modern web standards. By bypassing the traditional app stores, we can deliver updates to you instantly and take up significantly less storage space on your device!</p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">2. Will this app take up a lot of space on my phone?</h3>
                <p className="text-gray-600">No! Because it relies on web technology, our app takes up only a fraction of the storage space (often just a few megabytes) compared to traditional apps.</p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">3. Does the app update automatically?</h3>
                <p className="text-gray-600">Yes. You will never need to manually download an update. Every time you open the app, it automatically fetches the latest features and data.</p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">4. Can I receive push notifications?</h3>
                <p className="text-gray-600"><strong>Android:</strong> Yes, you will be prompted to allow notifications.<br />
                <strong>iOS:</strong> Yes, but your device must be running iOS 16.4 or later, and you must install the app to your Home Screen using the steps above first.</p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">5. How do I delete or uninstall the app?</h3>
                <p className="text-gray-600">You can remove it exactly the same way you would delete any normal app. On iOS, press and hold the app icon, then tap "Remove App". On Android, press and hold the app icon, then tap "Uninstall".</p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">6. Do I need an internet connection to use it?</h3>
                <p className="text-gray-600">You will need an active internet connection to browse data or complete actions. However, the app is designed to load much faster than a standard website on slow networks, and certain pages you've previously visited may load even when you have poor reception.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
