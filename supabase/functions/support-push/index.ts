import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
webpush.setVapidDetails('mailto:lluiz7628rd@gmail.com',Deno.env.get('VAPID_PUBLIC_KEY')!,Deno.env.get('VAPID_PRIVATE_KEY')!)

Deno.serve(async request=>{
  try{
    const {message_id}=await request.json()
    if(!message_id)return new Response('ignored',{status:202})
    const {data:message}=await supabase.from('support_messages').update({push_notified_at:new Date().toISOString()}).eq('id',message_id).eq('sender','customer').is('push_notified_at',null).select('id,body,message_type,conversation_id').maybeSingle()
    if(!message)return new Response('already processed',{status:200})
    const {data:conversation}=await supabase.from('support_conversations').select('customer_name,atendimento_started_at,status').eq('id',message.conversation_id).single()
    if(conversation?.atendimento_started_at||conversation?.status==='closed')return new Response('active attendance: notification suppressed',{status:200})
    const {data:subscriptions}=await supabase.from('support_push_subscriptions').select('id,endpoint,p256dh,auth')
    const payload=JSON.stringify({title:`Nova mensagem de ${conversation?.customer_name||'cliente'}`,body:message.message_type==='image'?'📷 Imagem':message.body,tag:`pixelsale-chat-${message.conversation_id}`,url:'/?page=support'})
    await Promise.all((subscriptions||[]).map(async subscription=>{try{await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},payload)}catch(error){if(error?.statusCode===404||error?.statusCode===410)await supabase.from('support_push_subscriptions').delete().eq('id',subscription.id);else console.error(error)}}))
    return new Response('sent',{status:200})
  }catch(error){console.error(error);return new Response('error',{status:500})}
})
