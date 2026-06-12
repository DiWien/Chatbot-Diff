(function(){
  const base = document.currentScript.src.replace('/widget/chatbot.js','');
  const css = document.createElement('link'); css.rel='stylesheet'; css.href=base+'/widget/chatbot.css'; document.head.appendChild(css);
  const btn = document.createElement('button'); btn.className='diff-chatbot-button'; btn.textContent='AI';
  const panel = document.createElement('div'); panel.className='diff-chatbot-panel';
  panel.innerHTML='<div class="diff-chatbot-head">Diff Coach</div><div class="diff-chatbot-body"></div><form class="diff-chatbot-form"><input placeholder="Hỏi Diff Coach..." required><button>Gửi</button></form>';
  document.body.append(btn,panel);
  const body = panel.querySelector('.diff-chatbot-body'); const form = panel.querySelector('form'); const input = panel.querySelector('input');
  function add(text,type){const el=document.createElement('div');el.className='diff-chatbot-msg '+(type||'');el.textContent=text;body.appendChild(el);body.scrollTop=body.scrollHeight;}
  fetch(base+'/api/public-config').then(r=>r.json()).then(c=>{panel.querySelector('.diff-chatbot-head').textContent=c.botName||'Diff Coach';add(c.welcomeMessage||'Xin chào, tôi có thể hỗ trợ gì?');}).catch(()=>add('Xin chào, tôi có thể hỗ trợ gì?'));
  btn.onclick=()=>panel.classList.toggle('open');
  form.onsubmit=async(e)=>{e.preventDefault();const message=input.value.trim();if(!message)return;add(message,'user');input.value='';try{const r=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,source:location.hostname})});const d=await r.json();add(d.reply||'Không có phản hồi.');}catch{add('Chatbot đang bận, vui lòng thử lại sau.');}};
})();
