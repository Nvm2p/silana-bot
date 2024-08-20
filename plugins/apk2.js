import fetch from 'node-fetch';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  if (!args[0]) throw 'مثال:\n ' + usedPrefix + command + ' lite';
  let info = await apkinfo(text);
  let res = await apk(text);

  if (res.size > 20000000) {
    m.react(error);
    throw '*ملف APK كبير جدًا. الحد الأقصى لحجم التنزيل هو 2000 ميجابايت*.';
  }

  await conn.sendMessage(m.chat, {
    image: { url: info.icon },
    caption: `*إسم التطبيق:* \n${info.name}\n*الباكيدج الخاص به:* \n${info.packageN}\n*ملف ثانوي للتطبيق:* \n*OBB*\n${info.obb_link}`,
    footer: '_Apk files..._',
  });

  await conn.sendMessage(m.chat, {
    text: `*جاري تحميل* ${info.name}...\n\nسعيد انك تستعمل جيطوسة بوت وسأكون مسرورا 😄 إن انضممت لأنستغرامي\ninstagram.com/nvm2p`,
  });

  // إرسال ملف APK
  await conn.sendMessage(
    m.chat,
    { document: { url: res.download }, mimetype: res.mimetype, fileName: res.fileName },
    { quoted: m }
  );

  // تنزيل وإرسال ملف OBB إذا كان متاحًا
  if (info.obb) {
    const obbFileName = `${info.packageN}.obb`;
    const obbStream = createWriteStream(obbFileName);
    
    await pipeline((await fetch(info.obb_link)).body, obbStream);

    await conn.sendMessage(
      m.chat,
      { document: { url: `./${obbFileName}` }, mimetype: 'application/octet-stream', fileName: obbFileName },
      { quoted: m }
    );
  }
};

handler.command = /^(apk2)$/i;
handler.help = ['apk2'];
handler.tags = ['applications'];
handler.premium = false;
export default handler;

async function apkinfo(url) {
  let res = await fetch('http://ws75.aptoide.com/api/7/apps/search?query=' + url + '&limit=1');
  let $ = await res.json();

  let icon = $.datalist.list[0].icon;
  let name = $.datalist.list[0].name;
  let packageN = $.datalist.list[0].package;
  let download = $.datalist.list[0].file.path;
  let obb_link;
  let obb;

  try {
    obb_link = $.datalist.list[0].obb.main.path;
    obb = true;
  } catch {
    obb_link = '_غير موجود_';
    obb = false;
  }

  if (!download) throw 'تعذر تحميل التطبيق انا اسفة';
  return { obb, obb_link, name, icon, packageN };
}

async function apk(url) {
  let res = await fetch('http://ws75.aptoide.com/api/7/apps/search?query=' + encodeURIComponent(url) + '&limit=1');
  let $ = await res.json();
  let fileName = $.datalist.list[0].package + '.apk';
  let download = $.datalist.list[0].file.path;
  let size = (await fetch(download, { method: 'head' })).headers.get('Content-Length');
  if (!download) throw 'Can\'t download the apk!';
  let icon = $.datalist.list[0].icon;
  let mimetype = (await fetch(download, { method: 'head' })).headers.get('content-type');

  return { fileName, mimetype, download, size };
}
