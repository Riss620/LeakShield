const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: 4000 });
    console.log(`Tunnel running at: ${tunnel.url}`);

    tunnel.on('close', () => {
      console.log('Tunnel closed, restarting...');
      setTimeout(startTunnel, 1000);
    });
  } catch (err) {
    console.error('Tunnel error:', err);
    setTimeout(startTunnel, 2000);
  }
}

startTunnel();
