const WebSocket = require('ws');
const url = "wss://musical-palm-tree-69x6xrx4ppp725q7v-3000.app.github.dev/api/voice/live?token=af2aa82bc42f7e0ee05f9715ea5b745d8196211c6e3c98c5a6acf928a7f9bb90";
const ws = new WebSocket(url);

ws.on('open', function open() {
  console.log('WS_OPEN');
  ws.close();
  process.exit(0);
});

ws.on('error', function error(err) {
  console.log('WS_ERROR: ' + err.message);
  process.exit(1);
});

ws.on('unexpected-response', function unexpectedResponse(req, res) {
  console.log('WS_UNEXPECTED: ' + res.statusCode);
  process.exit(1);
});

setTimeout(() => {
  console.log('WS_TIMEOUT');
  process.exit(1);
}, 10000);
