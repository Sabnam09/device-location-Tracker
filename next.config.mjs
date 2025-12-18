/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // Ye pattern kisi bhi /type/action/code ko handle karega
        source: '/:type/:action/:code',
        destination: '/', 
      },
    ];
  },
};

export default nextConfig;