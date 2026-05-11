import { build } from 'vite';

async function run() {
  try {
    await build();
  } catch (err) {
    console.error('BUILD FAILED:');
    if (err.errors) {
      console.error(JSON.stringify(err.errors, null, 2));
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

run();
