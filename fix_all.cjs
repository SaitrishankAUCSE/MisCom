const fs = require('fs');
const files = [
  './src/pages/Onboarding1.jsx',
  './src/pages/Onboarding2.jsx',
  './src/pages/AuthChoice.jsx',
  './src/pages/Login.jsx',
  './src/pages/Signup.jsx',
  './src/pages/OTPVerification.jsx',
  './src/pages/ProfileSetup.jsx',
  './src/pages/Welcome.jsx',
  './src/pages/Home.jsx',
  './src/pages/Chats.jsx',
  './src/pages/VibeRooms.jsx',
  './src/pages/MemoryTimeline.jsx',
  './src/pages/LiveMusic.jsx',
  './src/pages/AIInsights.jsx',
  './src/pages/Profile.jsx',
  './src/components/BottomNav.jsx',
  './src/components/TopAppBar.jsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf-8');
  content = content.replace(/max-w-2/g, 'max-w-xs');
  content = content.replace(/max-w-4/g, 'max-w-sm');
  content = content.replace(/max-w-6/g, 'max-w-md');
  content = content.replace(/max-w-10/g, 'max-w-lg');
  content = content.replace(/max-w-16/g, 'max-w-xl');

  content = content.replace(/font-([a-z]+)-2/g, 'font-$1-xs');
  content = content.replace(/font-([a-z]+)-4/g, 'font-$1-sm');
  content = content.replace(/font-([a-z]+)-6/g, 'font-$1-md');
  content = content.replace(/font-([a-z]+)-10/g, 'font-$1-lg');

  content = content.replace(/text-([a-z]+)-2/g, 'text-$1-xs');
  content = content.replace(/text-([a-z]+)-4/g, 'text-$1-sm');
  content = content.replace(/text-([a-z]+)-6/g, 'text-$1-md');
  content = content.replace(/text-([a-z]+)-10/g, 'text-$1-lg');

  fs.writeFileSync(f, content);
});
console.log("Fixed files!");
