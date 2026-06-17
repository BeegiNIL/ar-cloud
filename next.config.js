/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow large API payloads for project saves
  api: {
    bodyParser: { sizeLimit: '10mb' }
  },
  // Serve /libs/ files from public/libs/
  async headers() {
    return [
      {
        source: '/libs/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
