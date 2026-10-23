/**
 * Álbum ao vivo do desafio fotográfico — Raphaela & Matheus.
 *
 * As fotos ficam numa pasta do Google Drive de quem publicar este script.
 * A planilha "Índice do desafio" fica dentro da mesma pasta e só guarda os dados de cada envio.
 *
 * Como publicar:
 * 1. script.google.com → Novo projeto.
 * 2. Apague o código de exemplo e cole este arquivo.
 * 3. Implantar → Nova implantação → App da Web.
 * 4. Executar como: Eu. Quem tem acesso: Qualquer pessoa.
 * 5. Copie a URL que termina em /exec para desafio/config.js e publique o site.
 *
 * Use a conta Google que deve ser dona das fotos.
 */
var FOLDER_NAME = 'Casamento Raphaela e Matheus — Desafio fotográfico';
var SHEET_NAME = 'Fotos';
var LIKES_SHEET = 'Curtidas';
var MAX_IMAGE_CHARS = 3500000;

function folder_() {
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty('FOLDER_ID');
  if (savedId) {
    try {
      return DriveApp.getFolderById(savedId);
    } catch (err) {
      props.deleteProperty('FOLDER_ID');
    }
  }
  var found = DriveApp.getFoldersByName(FOLDER_NAME);
  var folder = found.hasNext() ? found.next() : DriveApp.createFolder(FOLDER_NAME);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function sheet_() {
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty('SHEET_ID');
  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId).getSheetByName(SHEET_NAME);
    } catch (err) {
      props.deleteProperty('SHEET_ID');
    }
  }
  var folder = folder_();
  var files = folder.getFilesByName('Índice do desafio');
  var ss;
  if (files.hasNext()) {
    ss = SpreadsheetApp.openById(files.next().getId());
  } else {
    ss = SpreadsheetApp.create('Índice do desafio');
    DriveApp.getFileById(ss.getId()).moveTo(folder);
  }
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.getSheets()[0];
    sh.setName(SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(['id', 'clientId', 'criadoEm', 'mesa', 'desafioId', 'desafioTitulo', 'autor', 'legenda', 'url', 'thumb', 'deviceId', 'fileId']);
  }
  props.setProperty('SHEET_ID', ss.getId());
  return sh;
}

function plain_(value, max) {
  var text = String(value || '').replace(/[\u0000-\u001F]+/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function likesSheet_() {
  var ss = sheet_().getParent();
  var sh = ss.getSheetByName(LIKES_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LIKES_SHEET);
    sh.appendRow(['fotoId', 'deviceId', 'criadoEm']);
  } else if (sh.getLastRow() === 0) {
    sh.appendRow(['fotoId', 'deviceId', 'criadoEm']);
  }
  return sh;
}

function idOk_(value) {
  return /^[A-Za-z0-9-]{8,60}$/.test(String(value || ''));
}

function rowToFoto_(row, counts, mine) {
  var id = String(row[0] || '');
  return {
    id: id,
    clientId: String(row[1] || ''),
    criadoEm: String(row[2] || ''),
    mesa: String(row[3] || ''),
    desafioId: String(row[4] || ''),
    desafioTitulo: String(row[5] || ''),
    autor: String(row[6] || ''),
    legenda: String(row[7] || ''),
    url: String(row[8] || ''),
    thumb: String(row[9] || ''),
    deviceId: String(row[10] || ''),
    curtidas: counts[id] || 0,
    curtiu: !!mine[id]
  };
}

function listFotos_(deviceId) {
  var likes = likesSheet_().getDataRange().getValues();
  var counts = {};
  var mine = {};
  for (var i = 1; i < likes.length; i++) {
    var fotoId = String(likes[i][0] || '');
    var quem = String(likes[i][1] || '');
    if (!fotoId || !quem) continue;
    counts[fotoId] = (counts[fotoId] || 0) + 1;
    if (deviceId && quem === deviceId) mine[fotoId] = true;
  }
  var values = sheet_().getDataRange().getValues();
  var out = [];
  for (var r = 1; r < values.length; r++) {
    if (!values[r][0]) continue;
    out.push(rowToFoto_(values[r], counts, mine));
  }
  return out;
}

function toggleLike_(data) {
  data = data || {};
  var fotoId = String(data.fotoId || '');
  var deviceId = String(data.deviceId || '');
  if (!idOk_(fotoId) || !idOk_(deviceId)) return { ok: false, erro: 'foto' };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var fotos = sheet_().getDataRange().getValues();
    var existe = false;
    for (var i = 1; i < fotos.length; i++) {
      if (String(fotos[i][0]) === fotoId) {
        existe = true;
        break;
      }
    }
    if (!existe) return { ok: false, erro: 'foto' };

    var sh = likesSheet_();
    var rows = sh.getDataRange().getValues();
    var linha = 0;
    for (var r = 1; r < rows.length; r++) {
      if (String(rows[r][0]) === fotoId && String(rows[r][1]) === deviceId) {
        linha = r + 1;
        break;
      }
    }
    var curtiu;
    if (linha) {
      sh.deleteRow(linha);
      curtiu = false;
    } else {
      sh.appendRow([
        fotoId,
        deviceId,
        Utilities.formatDate(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss")
      ]);
      curtiu = true;
    }
    var total = 0;
    var depois = sh.getDataRange().getValues();
    for (var k = 1; k < depois.length; k++) {
      if (String(depois[k][0]) === fotoId) total++;
    }
    return { ok: true, acao: 'curtir', fotoId: fotoId, curtidas: total, curtiu: curtiu };
  } finally {
    lock.releaseLock();
  }
}

function savePhoto_(data) {
  data = data || {};
  var mesa = plain_(data.mesa, 2);
  var desafioId = plain_(data.desafioId, 24).toLowerCase();
  var imagem = String(data.imagem || '').trim();
  if (/^data:/i.test(imagem)) imagem = imagem.split(',')[1] || '';
  imagem = imagem.replace(/\s/g, '');

  if (!/^\d{2}$/.test(mesa)) return { ok: false, erro: 'mesa' };
  if (!/^[a-z0-9-]{1,24}$/.test(desafioId)) return { ok: false, erro: 'desafio' };
  if (!imagem) return { ok: false, erro: 'imagem' };
  if (imagem.length > MAX_IMAGE_CHARS) return { ok: false, erro: 'grande' };

  var bytes;
  try {
    bytes = Utilities.base64Decode(imagem);
  } catch (err) {
    return { ok: false, erro: 'imagem' };
  }
  if (!bytes || bytes.length < 32) return { ok: false, erro: 'imagem' };

  var id = Utilities.getUuid();
  var clientId = plain_(data.clientId, 60) || id;
  var deviceId = plain_(data.deviceId, 60);
  var criado = Utilities.formatDate(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss");
  var nome = 'mesa-' + mesa + '_' + desafioId + '_' + criado.replace(/[:T]/g, '-') + '.jpg';
  var folder = folder_();
  var file = folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', nome));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  var foto = {
    id: id,
    clientId: clientId,
    criadoEm: criado,
    mesa: mesa,
    desafioId: desafioId,
    desafioTitulo: plain_(data.desafioTitulo, 160),
    autor: plain_(data.autor, 80),
    legenda: plain_(data.legenda, 140),
    url: 'https://lh3.googleusercontent.com/d/' + fileId,
    thumb: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200',
    deviceId: deviceId
  };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sheet_().appendRow([
      foto.id,
      foto.clientId,
      foto.criadoEm,
      foto.mesa,
      foto.desafioId,
      foto.desafioTitulo,
      foto.autor,
      foto.legenda,
      foto.url,
      foto.thumb,
      foto.deviceId,
      fileId
    ]);
  } finally {
    lock.releaseLock();
  }

  return { ok: true, foto: foto, pastaUrl: folder.getUrl() };
}

function jsonOut_(payload, callback) {
  var body = JSON.stringify(payload);
  if (callback && /^[A-Za-z_][A-Za-z0-9_]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var callback = params.callback || '';
  var deviceId = idOk_(params.device) ? String(params.device) : '';
  try {
    var folder = folder_();
    return jsonOut_({
      ok: true,
      aoVivo: true,
      pastaUrl: folder.getUrl(),
      fotos: listFotos_(deviceId)
    }, callback);
  } catch (err) {
    return jsonOut_({ ok: false, erro: 'lista', detalhe: String(err) }, callback);
  }
}

function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
  } catch (err) {
    data = e && e.parameter ? e.parameter : {};
  }
  try {
    if (data.acao === 'curtir') return jsonOut_(toggleLike_(data), '');
    return jsonOut_(savePhoto_(data), '');
  } catch (err2) {
    return jsonOut_({ ok: false, erro: 'rede', detalhe: String(err2) }, '');
  }
}
