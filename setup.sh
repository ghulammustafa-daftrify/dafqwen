#!/bin/bash
# Make executable: chmod +x setup.sh

# Setup script for Studio Footer project
# This script downloads the required fonts and video assets

set -e

echo "🎨 Setting up Studio Footer assets..."

# Create fonts directory
mkdir -p public/fonts

echo "📥 Downloading DM Sans Regular font..."
curl -L -o public/fonts/DMSans-Regular.woff2 \
  "https://cdn.prod.website-files.com/683703490bc01e1b8c052e06/68370ddd1dd328d7914d6512_DMSans-Regular.woff2"

echo "📥 Downloading Epilogue Black font..."
curl -L -o public/fonts/Epilogue-Black.woff2 \
  "https://cdn.prod.website-files.com/683703490bc01e1b8c052e06/68370ddd06d737200122a835_Epilogue-Black.woff2"

echo "📥 Downloading background video..."
curl -L -o public/footer-background.mp4 \
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260908_073327_03643c0a-db33-417a-ae8f-4a39259c7f9c.mp4"

# Check if FFmpeg is available
if command -v ffmpeg &> /dev/null; then
    echo "🎬 Processing video with FFmpeg for smooth scrubbing..."
    ffmpeg -hide_banner -loglevel error \
      -i public/footer-background.mp4 \
      -an -c:v libx264 -preset fast -crf 20 -g 1 \
      -pix_fmt yuv420p -movflags +faststart \
      public/footer-scrub.mp4
    echo "✅ Video processed successfully!"
else
    echo "⚠️  FFmpeg not found. Copying original video instead..."
    echo "   For smooth eye tracking, install FFmpeg and re-run this script."
    cp public/footer-background.mp4 public/footer-scrub.mp4
    echo "✅ Video copied (eye tracking may not be as smooth)"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm install"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:3000"
echo ""
