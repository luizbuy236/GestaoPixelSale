self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={};try{data=event.data?.json()||{}}catch{data={body:event.data?.text()}}
  event.waitUntil(self.registration.showNotification(data.title||'Nova mensagem — PixelSale',{
    body:data.body||'Um cliente enviou uma nova mensagem.',
    icon:'/assets/pixelsale-logo.png',badge:'/assets/pixelsale-logo.png',
    tag:data.tag||'pixelsale-chat',renotify:true,silent:false,requireInteraction:true,vibrate:[300,120,300,120,500],
    data:{url:data.url||'/?page=support'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const url=new URL(event.notification.data?.url||'/?page=support',self.location.origin).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{const existing=windows.find(client=>client.url.startsWith(self.location.origin));if(existing){existing.navigate(url);return existing.focus()}return clients.openWindow(url)}));
});
