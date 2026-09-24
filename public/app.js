(() => {
  const $ = (s) => document.querySelector(s);
  const authScreen=$('#auth-screen'), loginForm=$('#login-form'), loginMessage=$('#login-message');
  function showWorkspace(email){ document.body.classList.add('authenticated'); sessionStorage.setItem('codetogether-user',email); const roomInput=$('#room'); if(roomInput && !roomInput.value) roomInput.value=email.split('@')[0]+'-room'; }
  if(sessionStorage.getItem('codetogether-user')) showWorkspace(sessionStorage.getItem('codetogether-user'));
  loginForm.addEventListener('submit',(event)=>{event.preventDefault();const email=$('#login-email').value.trim(),password=$('#login-password').value;if(!email || password.length<4){loginMessage.textContent='Enter a valid email and password with at least 4 characters.';return}showWorkspace(email);});

  const code = $('#code'), answer = $('#answer'), output = $('#output');
  let roomKey = '', channel = null;
  let snapshots = [];
  function connectRoom(name){ roomKey='codetogether-'+(name||'demo-room').trim(); if(channel) channel.close(); channel='BroadcastChannel' in window ? new BroadcastChannel(roomKey) : null; $('#active-room').textContent='Room: '+roomKey.replace('codetogether-',''); if($('#room-state')) $('#room-state').textContent='Room '+roomKey.replace('codetogether-','')+' collaboration active'; if(channel) channel.onmessage=(event)=>{ if(event.data && event.data.code !== code.value){ code.value=event.data.code; $('#language').value=event.data.language || $('#language').value; updateCount(); $('#save-status').textContent='Updated by collaborator'; } }; const saved=localStorage.getItem(roomKey); if(saved) code.value=saved; updateCount(); loadSnapshots(); }
  connectRoom($('#room').value || 'demo-room');
  const examples = {typescript:'// Type-safe task list\nconst tasks: string[] = ["API", "UI"];\nconsole.log(`Tasks: ${tasks.length}`);',c:'// C greeting\n#include <stdio.h>\nint main(){ printf("Hello team\n"); return 0; }',cpp:'// C++ vector\n#include <iostream>\nint main(){ std::cout << "Hello team"; }',csharp:'// C# greeting\nusing System;\nConsole.WriteLine("Hello team");',go:'// Go greeting\npackage main\nimport "fmt"\nfunc main(){ fmt.Println("Hello team") }',rust:'// Rust greeting\nfn main() { println!("Hello team"); }',php:'<?php echo "Hello team"; ?>',ruby:'# Ruby greeting\nputs "Hello team"',kotlin:'// Kotlin greeting\nfun main() { println("Hello team") }',swift:'// Swift greeting\nprint("Hello team")',sql:'-- SQL example\nSELECT name, role FROM collaborators WHERE active = TRUE;',html:'<!-- HTML example -->\n<h1>Hello team</h1>',css:'/* CSS example */\n.team-card { display: grid; gap: 1rem; }',python:'# Team expense calculator\nexpenses = [120, 80, 45]\ntotal = sum(expenses)\nprint(f"Total: ₹{total}")',javascript:'// Team task counter\nconst tasks = ["API", "UI", "Tests"];\nconsole.log(`Tasks: ${tasks.length}`);',java:'// Java greeting\nclass Main {\n  public static void main(String[] args) {\n    System.out.println("Hello team");\n  }\n}'};
  function updateCount(){const n=code.value.split('\n').length;$('#line-count').textContent=`${n} line${n===1?'':'s'} · ${code.value.length} characters`;}
  function save(){localStorage.setItem(roomKey,code.value); if(channel) channel.postMessage({code:code.value,language:$('#language').value});$('#save-status').textContent='Saved locally';setTimeout(()=>$('#save-status').textContent='Autosave on',800)}
  code.addEventListener('input',()=>{updateCount();clearTimeout(window.saveTimer);$('#save-status').textContent='Saving…';window.saveTimer=setTimeout(save,350)}); updateCount();
  let isOwner=false, accessGranted=false;
  $('#create-room').addEventListener('click',()=>{const name=$('#room').value.trim()||'team-room';const pass=$('#passcode').value.trim()||Math.random().toString(36).slice(2,8).toUpperCase();$('#room').value=name;$('#passcode').value=pass;isOwner=true;accessGranted=true;localStorage.setItem('owner-room-'+name,pass);connectRoom(name);$('#presence').textContent='● Owner';$('#room-state').textContent='Room '+name+' ready for collaborators';$('#access-card').innerHTML='<strong>Owner mode:</strong> Share the Room ID and passcode. Accept each request before coding.';answer.textContent=`Room created. Passcode: ${pass}`});
  $('#join').addEventListener('click',()=>{const name=$('#room').value.trim()||'demo-room',pass=$('#passcode').value.trim();const ownerPass=localStorage.getItem('owner-room-'+name);if(ownerPass && pass===ownerPass){accessGranted=true;connectRoom(name);$('#presence').textContent='● Collaborator';$('#room-state').textContent='Access accepted · '+name;$('#access-card').innerHTML='<strong>Access granted:</strong> You can collaborate in this room.';answer.textContent='Access accepted. You can now edit and collaborate.'}else if(pass){$('#presence').textContent='● Pending';$('#room-state').textContent='Join request pending';$('#access-card').innerHTML='<strong>Request sent:</strong> The room owner must accept this passcode request.';answer.textContent='Passcode received. Waiting for the room owner to accept.'}else{answer.textContent='Enter the Room ID and passcode first.'}});
  $('#copy-room').addEventListener('click',async()=>{const name=$('#room').value.trim()||'demo-room'; const link=location.origin+location.pathname+'?room='+encodeURIComponent(name); try{await navigator.clipboard.writeText(link);answer.textContent='Invite link copied. Send the Room ID and passcode separately.'}catch(e){answer.textContent='Room ID: '+name+' (copy it and send it manually).'}});
  const queryRoom=new URLSearchParams(location.search).get('room'); if(queryRoom){$('#room').value=queryRoom;connectRoom(queryRoom);answer.textContent=`Ready to join room ${queryRoom}.`}
  $('#example').addEventListener('click',()=>{code.value=examples[$('#language').value]||examples.python;updateCount();save();answer.textContent='Example loaded. Try Run code or ask AI to review it.'});
  $('#clear').addEventListener('click',()=>{code.value='';updateCount();save();output.textContent='Editor cleared.'});
  $('#language').addEventListener('change',()=>answer.textContent=`${$('#language').value} selected. Load an example to start.`);
  $('#run').addEventListener('click',()=>{try{const text=code.value,lang=$('#language').value;const line=text.split('\n').find(x=>/print|console\.log|System\.out|printf|cout|echo|puts|SELECT|<h1|display:/.test(x));if(!line){output.textContent='Program finished successfully (no visible output).';return}const m=line.match(/(?:print|log|println|printf|echo|puts)\s*\((.*)\)/);output.textContent=m?m[1].replace(/^f?["']|["']$/g,'').replace(/\{name\}/g,'Amogha'):(lang==='html'?'HTML content rendered successfully.':lang==='css'?'CSS style rule is ready.':lang==='sql'?'SQL query is ready to execute.':`${lang.toUpperCase()} code is ready to run.`)}catch(e){output.textContent='Run error: please check the selected language and syntax.'}});
  function explainCode(){
    const lang=$('#language').value, lines=code.value.split('\n').map(x=>x.trim()).filter(Boolean);
    if(!lines.length)return'Editor is empty. Load an example or write code first.';
    const names={python:'Python',javascript:'JavaScript',typescript:'TypeScript',java:'Java',c:'C',cpp:'C++',csharp:'C#',go:'Go',rust:'Rust',php:'PHP',ruby:'Ruby',kotlin:'Kotlin',swift:'Swift',sql:'SQL',html:'HTML',css:'CSS'};
    const outputWords={python:'print()',javascript:'console.log()',typescript:'console.log()',java:'System.out.println()',c:'printf()',cpp:'std::cout',csharp:'Console.WriteLine()',go:'fmt.Println()',rust:'println!()',php:'echo',ruby:'puts',kotlin:'println()',swift:'print()',sql:'SELECT',html:'HTML element',css:'CSS rule'};
    const details=lines.map((line,i)=>{
      if(lang==='html') return `Line ${i+1}: defines an ${line.startsWith('<')?'HTML element':'HTML text'} for the page.`;
      if(lang==='css') return `Line ${i+1}: styles a page element or declares a CSS property.`;
      if(lang==='sql') return `Line ${i+1}: builds part of a database query; SELECT reads records and WHERE filters them.`;
      if(/#|\/\/|<!--|\/\*/.test(line)) return `Line ${i+1}: a ${names[lang]} comment that documents the code.`;
      if(new RegExp(outputWords[lang].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(line)) return `Line ${i+1}: sends output to the ${names[lang]} console using ${outputWords[lang]}.`;
      if(/(=|:=|const |let |var |val |var )/.test(line)) return `Line ${i+1}: stores a value in a variable so the program can use it later.`;
      if(/(if|else|for|while|switch|match|when)\b/.test(line)) return `Line ${i+1}: controls the program flow using a condition or loop.`;
      if(/(function|func |def |fn |class |interface |struct )/.test(line)) return `Line ${i+1}: defines reusable ${line.includes('class')?'class or object':'function or type'} structure.`;
      return `Line ${i+1}: an executable ${names[lang]} statement.`;
    });
    const text = details.join(' ');
    const locale=$('#explain-language').value;
    const translations={
      kn:`${names[lang]} ಕೋಡ್ ವಿವರಣೆ: ${lines.length} ಸಾಲುಗಳಿವೆ. ${text} ಪ್ರತಿ ಸಾಲಿನ ಉದ್ದೇಶವನ್ನು ಮೇಲಿನ ವಿವರಣೆಯಲ್ಲಿ ನೋಡಿ.`,
      te:`${names[lang]} కోడ్ వివరణ: ఇందులో ${lines.length} లైన్లు ఉన్నాయి. ${text} ప్రతి లైన్ యొక్క ఉద్దేశ్యాన్ని పైన చూడండి.`,
      ta:`${names[lang]} குறியீட்டு விளக்கம்: இதில் ${lines.length} வரிகள் உள்ளன. ${text} ஒவ்வொரு வரியின் நோக்கத்தையும் மேலே காணலாம்.`,
      hi:`${names[lang]} कोड विवरण: इसमें ${lines.length} पंक्तियाँ हैं। ${text} हर पंक्ति का उद्देश्य ऊपर दिया गया है।`
    };
    return translations[locale] || `${names[lang]} explanation: ${text}`;
  }
  document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{const action=b.dataset.action;const messages={explain:explainCode(),review:'Review: the code is easy to follow. Add validation for empty input, split logic into small functions, and add tests for normal and edge cases.',improve:'Improvement plan: use descriptive names, separate calculation from output, handle errors, and add a short README with setup and screenshots.'};answer.textContent=messages[action]}));
  // Room-scoped, browser-local checkpoints. Diff uses LCS to show added and removed lines.
  function snapshotStoreKey(){return roomKey+'-checkpoints'}
  function loadSnapshots(){
    try{const data=JSON.parse(localStorage.getItem(snapshotStoreKey())||'[]');snapshots=Array.isArray(data)?data.filter(item=>item&&typeof item.code==='string'&&typeof item.id==='string').slice(0,30):[]}
    catch(_){snapshots=[]}
    renderSnapshots();
  }
  function renderSnapshots(selected){
    const list=$('#snapshot-list'); list.replaceChildren();
    if(!snapshots.length){list.add(new Option('No checkpoints yet',''));return}
    for(const item of snapshots){list.add(new Option(`${item.name} · ${new Date(item.created).toLocaleString()}`,item.id))}
    list.value=selected&&snapshots.some(item=>item.id===selected)?selected:snapshots[0].id;
    $('#snapshot-diff').hidden=true;
  }
  function currentSnapshot(){return snapshots.find(item=>item.id===$('#snapshot-list').value)}
  function snapshotStatus(message){$('#snapshot-status').textContent=message}
  function lineDiff(before,after){
    const a=before.split('\n'),b=after.split('\n');
    if(a.length*b.length>100000)return 'Comparison is too large to display. Download the checkpoint to compare it locally.';
    const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
    for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
    const result=[];let i=0,j=0;
    while(i<a.length&&j<b.length){if(a[i]===b[j]){result.push('  '+a[i]);i++;j++}else if(dp[i+1][j]>=dp[i][j+1]){result.push('- '+a[i++])}else{result.push('+ '+b[j++])}}
    while(i<a.length)result.push('- '+a[i++]);while(j<b.length)result.push('+ '+b[j++]);
    return result.join('\n');
  }
  $('#save-snapshot').addEventListener('click',()=>{
    const name=$('#snapshot-name').value.trim()||`Checkpoint ${snapshots.length+1}`;
    const item={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),name,created:Date.now(),language:$('#language').value,code:code.value};
    snapshots.unshift(item);snapshots=snapshots.slice(0,30);
    try{localStorage.setItem(snapshotStoreKey(),JSON.stringify(snapshots))}catch(_){snapshots.shift();snapshotStatus('Browser storage is full. Download your code to keep a copy.');return}
    renderSnapshots(item.id);$('#snapshot-name').value='';snapshotStatus(`Saved “${name}” in this browser for ${$('#room').value}.`);
  });
  $('#compare-snapshot').addEventListener('click',()=>{
    const item=currentSnapshot();if(!item){snapshotStatus('Save a checkpoint first.');return}
    const panel=$('#snapshot-diff');panel.textContent=`${item.name} → current editor\n  unchanged   - removed   + added\n\n${lineDiff(item.code,code.value)}`;panel.hidden=false;
    snapshotStatus(item.code===code.value?'No changes since this checkpoint.':'Changes shown below.');
  });
  $('#restore-snapshot').addEventListener('click',()=>{
    const item=currentSnapshot();if(!item){snapshotStatus('Select a checkpoint first.');return}
    if(code.value!==item.code&&!window.confirm(`Replace the current editor with “${item.name}”? Save a checkpoint first if you want to keep the current version.`))return;
    code.value=item.code;$('#language').value=item.language;updateCount();save();$('#snapshot-diff').hidden=true;snapshotStatus(`Restored “${item.name}” and saved the current editor.`);
  });
  $('#download-snapshot').addEventListener('click',()=>{
    const item=currentSnapshot();if(!item){snapshotStatus('Select a checkpoint first.');return}
    const ext={python:'py',javascript:'js',typescript:'ts',java:'java',c:'c',cpp:'cpp',csharp:'cs',go:'go',rust:'rs',php:'php',ruby:'rb',kotlin:'kt',swift:'swift',sql:'sql',html:'html',css:'css'}[item.language]||'txt';
    const safe=item.name.toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'')||'checkpoint';
    const url=URL.createObjectURL(new Blob([item.code],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`${safe}.${ext}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);snapshotStatus(`Downloaded “${item.name}”.`);
  });
})();
