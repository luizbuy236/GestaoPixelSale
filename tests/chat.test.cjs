const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
function setup(){
 const nodes=new Map(),sent=[],dialogs=[];
 const node=()=>({value:'',innerHTML:'',scrollHeight:500,scrollTop:0,clientHeight:100,children:[],querySelectorAll:()=>[],append(...items){this.children.push(...items)},addEventListener(name,fn){this[name]=fn},showModal(){this.open=true},close(){this.open=false;this.closeEvent?.()},remove(){this.removed=true}});
 const context={console,URL,Event,confirm:()=>true,queueMicrotask,navigator:{clipboard:{writeText:async text=>sent.push({name:'clipboard',text})}},loadingAdminMessages:false,pendingAdminMessagesLoad:false,pendingAdminMessagesForce:false,lastMessageSignatures:new Map(),CHAT_EMOJIS:[],CHAT_STICKERS:[],activeChatId:'test',sendingSticker:false,chatConversations:[{id:'test',status:'open',atendimento_started_at:'2026-01-01'}],chatTime:()=>'',decorateSupportMessages(){},showToast(){},setAdminChatStatus(){},startAdminChat(){},loadAdminChats:async()=>{},document:{activeElement:null,createElement:()=>{const n=node();n.addEventListener=(name,fn)=>n[name+'Event']=fn;return n},body:{append:n=>dialogs.push(n)}},$:(selector)=>nodes.get(selector),$$:()=>[],supabaseClient:{rpc:async(name,args)=>{sent.push({name,args});return {data:[],error:null}}}};
 for(const id of ['#supportThread','#supportMessages','#supportReply textarea','#supportReply','#supportEmojiToggle','#supportEmojiPicker','#supportStickerToggle','#supportStickerPicker','#supportStatus','#supportReply button[type="submit"]'])nodes.set(id,node());
 nodes.get('#supportReply').requestSubmit=()=>context.submitted=true;
 vm.createContext(context);
 vm.runInContext(source.match(/const escapeHtml=.*;/)[0]+source.slice(source.indexOf('function renderSupportText'),source.indexOf('async function startAdminChat')),context);
 return {context,nodes,sent,dialogs,node};
}
test('sent and received messages retain lines and clickable links',()=>{
 const {context:c}=setup();for(const sender of ['admin','customer']){const html=c.renderSupportMessage({sender,body:'Oi, tudo bem\nComo voce esta?\nTudo ok? https://example.com?a=1&b=2'});assert.match(html,/bem\nComo/);assert.match(html,/href="https:\/\/example.com\?a=1&amp;b=2"/);}
 assert.match(c.renderSupportText('WWW.example.com.'),/href="https:\/\/WWW.example.com"/);
 assert.doesNotMatch(c.renderSupportText('<script>alert(1)</script> javascript:alert(1)'),/<script>|href=/);
});
test('images open in a dialog that can be closed',()=>{
 const {context:c,dialogs,node}=setup();const image=node();image.querySelector=()=>({src:'data:image/png;base64,YQ=='});c.bindSupportImages({querySelectorAll:()=>[image]});image.onclick();assert.equal(dialogs[0].open,true);assert.equal(dialogs[0].children[1].src,'data:image/png;base64,YQ==');dialogs[0].children[0].onclick();assert.equal(dialogs[0].removed,true);
 assert.doesNotMatch(c.renderSupportMessage({message_type:'image',media_data:'javascript:alert(1)'}),/src=/);
});
test('Enter sends and Ctrl+Enter inserts newline',async()=>{
 const {context:c,nodes}=setup();await c.loadAdminMessages();const input=nodes.get('#supportReply textarea');let prevented=false;const event={key:'Enter',preventDefault(){prevented=true}};
 input.value='Ola mundo';input.selectionStart=3;input.selectionEnd=4;input.maxLength=2000;
 input.setRangeText=(text,start,end)=>{input.value=input.value.slice(0,start)+text+input.value.slice(end)};input.dispatchEvent=()=>{};
 input.onkeydown({...event,ctrlKey:true});assert.equal(input.value,'Ola\nmundo');assert.equal(prevented,true);assert.equal(c.submitted,undefined);
 prevented=false;input.onkeydown({...event,isComposing:true});assert.equal(prevented,false);assert.equal(c.submitted,undefined);
 input.onkeydown(event);assert.equal(prevented,true);assert.equal(c.submitted,true);
});

test('send passes multiline text to service unchanged',async()=>{
 const {context:c,nodes,sent}=setup();const body='Oi, tudo bem\nComo voce esta?\nTudo ok?';nodes.get('#supportReply textarea').value=body;await c.sendAdminReply({preventDefault(){}});assert.equal(sent.find(x=>x.name==='chat_admin_send').args.p_body,body);assert.equal(nodes.get('#supportReply textarea').value,'');
});
test('polling preserves draft while updating messages',async()=>{
 const {context:c,nodes}=setup();nodes.get('#supportReply textarea').value='Rascunho\nSegunda linha';await c.loadAdminMessages(false);assert.equal(nodes.get('#supportReply textarea').value,'Rascunho\nSegunda linha');
});
test('an update requested during an active message load is queued instead of lost',async()=>{
 const {context:c}=setup();let release,calls=0;
 c.supabaseClient.rpc=async()=>{calls++;if(calls===1)await new Promise(resolve=>release=resolve);return {data:[],error:null}};
 const first=c.loadAdminMessages(false);await Promise.resolve();await c.loadAdminMessages(false,true);assert.equal(calls,1);
 release();await first;await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,2);
});
test('message controls copy text and hide only for the signed-in admin',async()=>{
 const {context:c,sent,node}=setup(),copy=node(),remove=node();copy.dataset={copyMessage:'Mensagem completa'};remove.dataset={deleteMessage:'message-1'};
 c.bindSupportMessageActions({querySelectorAll:selector=>selector==='[data-copy-message]'?[copy]:[remove]});
 await copy.onclick();await remove.onclick();
 assert.deepEqual(sent.find(x=>x.name==='clipboard'),{name:'clipboard',text:'Mensagem completa'});
 assert.equal(sent.find(x=>x.name==='chat_admin_hide_message').args.p_message_id,'message-1');
});
