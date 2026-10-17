const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const app = express();
const PORT = process.env.PORT || 10000;
const GRUPO = '120363398379819803@g.us';
const ADMIN = '258841067961@s.whatsapp.net';
let sock = null;
const tabela = {"10":"512MB","20":"1GB","40":"2GB","60":"3GB","80":"4GB","100":"5GB","200":"10GB","28":"857MB SEMANAL","46":"1741MB SEMANAL","82":"2970MB SEMANAL","93":"3482MB SEMANAL","143":"5325MB SEMANAL","185":"7270MB SEMANAL","95":"2.8GB MENSAL","155":"5929MB MENSAL","175":"6953MB MENSAL","195":"7977MB MENSAL","255":"11049MB MENSAL","295":"13097MB MENSAL","450":"11GB DIAMANTE","510":"15GB DIAMANTE","650":"21GB DIAMANTE","830":"30GB DIAMANTE","1230":"50GB DIAMANTE"};
function getJid(m){let s=m.key.participant||m.key.remoteJid;if(s.includes(':'))s=s.split(':')[0]+'@s.whatsapp.net';return s;}
app.get('/',(r,s)=>s.send('Bot ativo'));
async function connect(){
const { state, saveCreds } = await useMultiFileAuthState('auth_info');
const { version } = await fetchLatestBaileysVersion();
sock = makeWASocket({ version, logger: pino({ level: 'silent' }), auth: state, browser: ["Ubuntu","Chrome","20.0.04"] });
sock.ev.on('creds.update', saveCreds);
if(!sock.authState.creds.registered){setTimeout(async()=>{try{const c=await sock.requestPairingCode("258841066314");console.log("CODIGO:"+c);}catch{}},3000);}
sock.ev.on('connection.update', (u)=>{ if(u.connection==='close'&&u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut)connect(); if(u.connection==='open')console.log('Conectado!'); });
sock.ev.on('group-participants.update', async(u)=>{
try{
if(u.id!==GRUPO||u.action!=='add')return;
for(const p of u.participants){
let pp=null;try{pp=await sock.profilePictureUrl(p,'image');}catch{}
let txt=`👋 BEM-VINDO @${p.split('@')[0]}!\n\n📶 MEGAS Vodacom baratos\n\nDigite:\n*tabela* - precos\n*semanal* - 7 dias\n*mensal* - 30 dias\n*diamante*\n*pagamento*`;
if(pp){await sock.sendMessage(u.id,{image:{url:pp},caption:txt,mentions:[p]});}else{await sock.sendMessage(u.id,{text:txt,mentions:[p]});}
}
}catch{}
});
sock.ev.on('messages.upsert', async(m)=>{
try{
const msg=m.messages[0];if(!msg||!msg.message||msg.key.fromMe)return;
const jid=msg.key.remoteJid;if(jid.endsWith('@g.us')&&jid!==GRUPO)return;
const sender=getJid(msg);
let texto=(msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||"").trim();if(!texto)return;
let cmd=texto.toLowerCase();
let isAdmin=false;let gAdmins=[];
if(jid.endsWith('@g.us')){const meta=await sock.groupMetadata(jid).catch(()=>null);if(meta){gAdmins=meta.participants.filter(p=>p.admin!==null).map(p=>p.id);isAdmin=gAdmins.includes(sender);}}
if(cmd==='tabela'){await sock.sendMessage(jid,{text:`📶 DIARIOS\n10MT=512MB\n20MT=1GB\n40MT=2GB\n60MT=3GB\n80MT=4GB\n100MT=5GB\n200MT=10GB\n\nsemanal | mensal | diamante`},{quoted:msg});return;}
if(cmd==='pagamento'){await sock.sendMessage(jid,{text:`💳 M-Pesa: 856150578\nE-Mola: 877114280\nNome: Fenias Eduardo`},{quoted:msg});return;}
if(jid.endsWith('@g.us')&&cmd.startsWith('.ban')){if(!isAdmin)return;const ctx=msg.message.extendedTextMessage?.contextInfo;let t=ctx?.participant||ctx?.mentionedJid?.[0];if(!t||gAdmins.includes(t))return;await sock.groupParticipantsUpdate(jid,[t],'remove').catch(()=>{});return;}
if(jid.endsWith('@g.us')&&!isAdmin){if(/(https?:\/\/|chat\.whatsapp\.com|wa\.me)/i.test(texto)){try{await sock.sendMessage(jid,{delete:{remoteJid:jid,fromMe:false,id:msg.key.id,participant:sender}});await sock.groupParticipantsUpdate(jid,[sender],'remove');}catch{}return;}}
const mv=texto.match(/(\d+[\d\.,]*)\s*(MT|Meticais)/i);
if(mv){let v=mv[1].replace(/,/g,'');let vl=Math.floor(parseFloat(v)).toString();if(!tabela[vl])return;const mr=texto.match(/\b(PP\d{6}\.\d{4}\.[A-Z0-9]+)\b/i)||texto.match(/\b(DI\d+[A-Z0-9]*)\b/i);if(mr){try{await sock.sendMessage(ADMIN,{text:texto});}catch{}await sock.sendMessage(jid,{text:`✅ RECEBIDO\nRef: ${mr[0]}\nPacote: ${tabela[vl]}\nA processar...`},{quoted:msg});}}
}catch(e){console.error(e);}
});
}
connect();
app.listen(PORT,()=>console.log('Rodando '+PORT));
