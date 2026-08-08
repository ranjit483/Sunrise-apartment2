/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    'firebase',
    '@firebase/app',
    '@firebase/auth',
    '@firebase/component',
    '@firebase/firestore',
    '@firebase/util'
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'firebase/app': require.resolve('firebase/app'),
      'firebase/auth': require.resolve('firebase/auth'),
      'firebase/firestore': require.resolve('firebase/firestore'),
    };
    return config;
  },
}

module.exports = nextConfig