fetch('http://localhost:3000/api/push/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    driverId: 'testing',
    subscription: { endpoint: 'test', keys: { p256dh: 'test', auth: 'test' } }
  })
}).then(res => res.text()).then(console.log).catch(console.error);
