/**
 * Projeto novo, separado do script que recebe as confirmações.
 * Não altera a aba Confirmacoes nem as outras abas já existentes.
 * Só cria a aba "Convites", se ela ainda não existir, e acrescenta ou remove nomes nela.
 *
 * SPREADSHEET_ID é o trecho entre /d/ e /edit no endereço da planilha.
 * Implantar como app da Web: executar como você, acesso "Qualquer pessoa".
 */
var SPREADSHEET_ID = '1iTl_W1nwi-TkngoTJNQVuk-FGGqevi080RwX_JGUGo8';
var SHEET_NAME = 'Convites';

function sheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['nome', 'criadoEm']);
  }
  return sh;
}

function slugify_(value) {
  var map = {
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c', 'ñ': 'n'
  };
  return String(value || '')
    .toLowerCase()
    .replace(/[áàãâäéèêëíìîïóòõôöúùûüçñ]/g, function (ch) { return map[ch] || ch; })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function listGuests_() {
  var values = sheet_().getDataRange().getValues();
  var out = [];
  var seen = {};
  for (var i = 1; i < values.length; i++) {
    var nome = String(values[i][0] || '').trim().replace(/\s+/g, ' ');
    var slug = slugify_(nome);
    if (!slug || seen[slug]) continue;
    seen[slug] = true;
    out.push({ nome: nome });
  }
  return out;
}

function addGuest_(nome) {
  nome = String(nome || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  var slug = slugify_(nome);
  if (!slug) return { ok: false };
  var guests = listGuests_();
  for (var i = 0; i < guests.length; i++) {
    if (slugify_(guests[i].nome) === slug) return { ok: true, nome: guests[i].nome };
  }
  sheet_().appendRow([nome, new Date()]);
  return { ok: true, nome: nome };
}

function deleteGuest_(nome) {
  nome = String(nome || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  var slug = slugify_(nome);
  if (!slug) return { ok: false };
  var sh = sheet_();
  var values = sh.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    var rowName = String(values[i][0] || '').trim().replace(/\s+/g, ' ');
    if (slugify_(rowName) === slug) sh.deleteRow(i + 1);
  }
  return { ok: true, nome: nome };
}

function doGet(e) {
  var callback = e && e.parameter ? e.parameter.callback : '';
  var body = JSON.stringify(listGuests_());
  if (callback && /^[A-Za-z_][A-Za-z0-9_]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
  } catch (err) {
    data = {};
  }
  var result = data.acao === 'apagar' ? deleteGuest_(data.nome) : addGuest_(data.nome);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
