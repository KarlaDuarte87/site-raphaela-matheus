(function () {
    const D = window.RMDesafio;
    const app = document.getElementById('app');
    const albumLink = document.getElementById('albumLink');

    const state = {
        data: null,
        mesa: null,
        fotos: [],
        view: 'lista',
        desafioId: null,
        foto: null,
        enviando: false,
        erro: '',
        camera: false,
        facing: 'environment',
        capturando: false,
        publicacao: null,
        shareMsg: '',
        shareLink: '',
        escaneando: false
    };

    let stream = null;
    let leitura = 0;

    function pararCamera() {
        leitura += 1;
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
        }
        state.camera = false;
    }

    function encaixarCamera() {
        const video = document.getElementById('cameraVideo');
        if (!video || !stream) return;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.classList.toggle('is-user', state.facing === 'user');
        video.play().catch(() => {});
    }

    async function pedirStream() {
        const tentativas = [
            { audio: false, video: { facingMode: { ideal: state.facing }, width: { ideal: 1200 }, height: { ideal: 1600 } } },
            { audio: false, video: { facingMode: state.facing } },
            { audio: false, video: true }
        ];
        let ultimo;
        for (const pedido of tentativas) {
            try {
                return await navigator.mediaDevices.getUserMedia(pedido);
            } catch (err) {
                ultimo = err;
                if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) throw err;
            }
        }
        throw ultimo || new Error('camera');
    }

    function abrirCameraNativa() {
        const input = document.getElementById('cameraNativa');
        if (input) input.click();
    }

    async function ligarCamera() {
        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            abrirCameraNativa();
            return;
        }
        const anterior = stream;
        try {
            const novo = await pedirStream();
            if (anterior && anterior !== novo) {
                anterior.getTracks().forEach((track) => track.stop());
            }
            stream = novo;
            state.camera = true;
            state.erro = '';
            render();
        } catch (err) {
            if (anterior) {
                state.erro = 'Não foi possível virar a câmera. Tente de novo.';
                render();
                return;
            }
            if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
                state.erro = 'Para abrir a câmera aqui, permita o acesso quando o celular pedir. Ou escolha uma foto da galeria.';
                render();
                return;
            }
            abrirCameraNativa();
        }
    }

    async function disparar() {
        const video = document.getElementById('cameraVideo');
        if (!video || state.capturando) return;
        if (!video.videoWidth) {
            state.erro = 'A câmera ainda está abrindo. Espere um instante e toque de novo.';
            const nota = document.querySelector('#envio .note');
            if (nota) nota.textContent = state.erro;
            else render();
            return;
        }
        state.capturando = true;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const proporcao = 3 / 4;
        const atual = vw / vh;
        let sx = 0;
        let sy = 0;
        let sw = vw;
        let sh = vh;
        if (atual > proporcao) {
            sw = vh * proporcao;
            sx = (vw - sw) / 2;
        } else {
            sh = vw / proporcao;
            sy = (vh - sh) / 2;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sw));
        canvas.height = Math.max(1, Math.round(sh));
        const ctx = canvas.getContext('2d');
        if (state.facing === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        state.capturando = false;
        if (!blob) {
            state.erro = D.mensagem('ler');
            render();
            return;
        }
        try {
            state.foto = await D.lerFoto(new File([blob], 'camera.jpg', { type: 'image/jpeg' }));
            state.erro = '';
        } catch (err) {
            state.foto = null;
            state.erro = D.mensagem(err.message);
        }
        pararCamera();
        render();
    }

    function cenas() {
        return state.mesa ? state.mesa.desafios : [];
    }

    function feitas() {
        return cenas().filter((cena) => D.minhas(state.fotos, state.mesa.id, cena.id).length > 0);
    }

    function proxima(depoisDe) {
        const lista = cenas();
        const inicio = Math.max(0, lista.findIndex((cena) => cena.id === depoisDe) + 1);
        const giro = lista.slice(inicio).concat(lista.slice(0, inicio));
        return giro.find((cena) => D.minhas(state.fotos, state.mesa.id, cena.id).length === 0) || null;
    }

    function cenaAtiva() {
        return cenas().find((cena) => cena.id === state.desafioId) || null;
    }

    function abrir(view, desafioId) {
        pararCamera();
        state.view = view;
        state.desafioId = desafioId || null;
        state.foto = null;
        state.erro = '';
        state.enviando = false;
        state.shareMsg = '';
        state.shareLink = '';
        if (view !== 'sucesso') state.publicacao = null;
        render();
        window.scrollTo(0, 0);
    }

    function banner() {
        if (D.aoVivo()) return '';
        return '<p class="banner">Modo de ensaio: a foto fica só neste celular. O álbum da festa entra no ar quando o Google Drive estiver ligado.</p>';
    }

    function renderLista() {
        const total = cenas().length;
        const prontas = feitas().length;
        const cards = cenas().map((cena) => {
            const minhas = D.minhas(state.fotos, state.mesa.id, cena.id);
            const feita = minhas.length > 0;
            const thumb = feita ? D.safeSrc(minhas[minhas.length - 1].url) : '';
            const marca = cena.livre ? '+' : cena.id;
            return `
                <button type="button" class="scene${feita ? ' is-done' : ''}" data-action="abrir" data-id="${D.esc(cena.id)}">
                    <span class="scene-top">
                        <span class="scene-num">${D.esc(marca)}</span>
                        ${thumb ? `<img class="scene-thumb" src="${thumb}" alt="">` : '<span class="dot"></span>'}
                    </span>
                    <h2>${D.esc(cena.titulo)}</h2>
                    <span class="scene-go">${feita ? 'Enviar outra' : 'Capturar'}</span>
                </button>`;
        }).join('');

        app.innerHTML = `
            ${banner()}
            <span class="kicker">A missão secreta · ${D.esc(state.mesa.nome)}</span>
            <h1 class="display">Sua missão</h1>
            <div class="gold-line"></div>
            <p class="lede">Escolha uma cena e capture durante a festa. As fotos entram no álbum dos noivos na hora.</p>
            <div class="progress" aria-hidden="true"><span style="width:${total ? (prontas / total) * 100 : 0}%"></span></div>
            <p class="progress-label">${prontas} de ${total} capturadas</p>
            <div class="scene-grid">${cards}</div>
            <p class="hint">Pode enviar mais de uma foto da mesma cena. Se quiser, assine com o seu nome. Na publicação, marque ${D.esc(D.fraseMarcas())}.</p>`;
    }

    function renderCaptura() {
        const cena = cenaAtiva();
        if (!cena) {
            abrir('lista');
            return;
        }
        const preview = state.foto
            ? `<div class="preview"><img src="${state.foto.dataUrl}" alt="Foto escolhida"></div>`
            : '';
        const cameraAoVivo = state.camera
            ? `<div class="camera-live">
                    <video id="cameraVideo" playsinline autoplay muted></video>
                    <div class="camera-tools">
                        <button type="button" class="linkish" data-action="virar">Virar</button>
                        <button type="button" class="shutter" data-action="disparar" aria-label="Capturar foto"></button>
                        <button type="button" class="linkish" data-action="fechar-camera">Fechar</button>
                    </div>
                </div>`
            : `<div class="photo-choices">
                    <button type="button" class="picker" data-action="camera">
                        <strong>${state.foto ? 'Tirar outra' : 'Abrir câmera'}</strong>
                        <span>A câmera abre aqui, na própria página.</span>
                    </button>
                    <label class="picker picker-alt">
                        <strong>${state.foto ? 'Trocar pela galeria' : 'Escolher da galeria'}</strong>
                        <input id="arquivo" type="file" accept="image/*">
                    </label>
                </div>`;
        app.innerHTML = `
            <button type="button" class="back" data-action="lista">← Cenas</button>
            <p class="scene-kicker">Sua cena · ${D.esc(state.mesa.nome)}</p>
            <h1 class="scene-title font-serif">${D.esc(cena.titulo)}</h1>
            <form id="envio">
                ${cameraAoVivo}
                <input id="cameraNativa" type="file" accept="image/*" capture="environment">
                ${preview}
                <div class="field">
                    <label for="autor">Assinado por</label>
                    <input id="autor" name="autor" maxlength="80" autocomplete="name" value="${D.esc(D.autor())}" placeholder="Opcional">
                </div>
                <div class="field">
                    <label for="legenda">Uma palavra para a foto</label>
                    <input id="legenda" name="legenda" maxlength="140" placeholder="Opcional">
                </div>
                ${state.erro ? `<p class="note">${D.esc(state.erro)}</p>` : ''}
                <button class="btn" type="submit" ${state.enviando || !state.foto ? 'disabled' : ''}>${state.enviando ? 'Enviando…' : 'Enviar'}</button>
            </form>`;
    }

    function renderSucesso() {
        const prontas = feitas();
        const total = cenas().length;
        const faltam = cenas().filter((cena) => !prontas.some((feita) => feita.id === cena.id));
        const lista = faltam.length
            ? `<div class="still"><p>Ainda por capturar</p><ul>${faltam.map((cena) => `<li>${D.esc(cena.titulo)}</li>`).join('')}</ul></div>`
            : '<p class="rank-line">A missão desta mesa está completa.</p>';
        const temProxima = Boolean(proxima(state.desafioId));

        const previa = state.publicacao && D.safeSrc(state.publicacao.dataUrl)
            ? `<div class="preview"><img src="${D.safeSrc(state.publicacao.dataUrl)}" alt="Foto capturada"></div>`
            : '';

        app.innerHTML = `
            <div class="seal" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                    <path d="M5 12.5l4.2 4.2L19 7.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h1 class="page-title">Cena capturada</h1>
            ${previa}
            <p class="hint">Publique a foto e marque ${D.esc(D.fraseMarcas())}.</p>
            <button type="button" class="btn btn-ghost" data-action="compartilhar">Compartilhar</button>
            <p class="share-apps">Instagram · WhatsApp · Facebook</p>
            ${state.shareMsg ? `<p class="share-status">${D.esc(state.shareMsg)}</p>` : ''}
            ${state.shareLink ? `<a class="linkish" href="${D.esc(state.shareLink)}" target="_blank" rel="noopener">Abrir no WhatsApp</a>` : ''}
            <p class="progress-label" style="margin-top:0.8rem">${prontas.length} de ${total} capturadas</p>
            <div class="dots">${cenas().map((cena) => `<i class="${prontas.some((feita) => feita.id === cena.id) ? 'is-on' : ''}"></i>`).join('')}</div>
            ${lista}
            <p class="hint">No álbum, cada pessoa pode curtir. As fotos com mais corações sobem na classificação.</p>
            ${temProxima ? '<button type="button" class="btn" data-action="proxima">Vamos à próxima</button>' : `<a class="btn" href="album.html?mesa=${D.esc(state.mesa.id)}">Ver o álbum</a>`}
            <button type="button" class="linkish" data-action="lista">Voltar às cenas</button>
            <a class="linkish" href="album.html?mesa=${D.esc(state.mesa.id)}">Ver o álbum</a>`;
    }

    function iconeEscanear() {
        return `<svg class="scan-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <path d="M7 3H5a2 2 0 0 0-2 2v2" stroke-linecap="round"/>
            <path d="M17 3h2a2 2 0 0 1 2 2v2" stroke-linecap="round"/>
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" stroke-linecap="round"/>
            <path d="M3 17v2a2 2 0 0 0 2 2h2" stroke-linecap="round"/>
            <path d="M4 12h16" stroke-linecap="round"/>
        </svg>`;
    }

    function mesaDoQr(valor) {
        if (!valor || !state.data) return '';
        let mesa = '';
        try {
            mesa = new URL(valor, location.href).searchParams.get('mesa') || '';
        } catch (err) {
            return '';
        }
        const id = mesa.trim();
        const achada = state.data.mesas.find((item) => item.id === id || item.id === id.padStart(2, '0'));
        return achada ? achada.id : '';
    }

    function irParaMesa(mesa) {
        leitura += 1;
        pararCamera();
        state.escaneando = false;
        location.href = location.pathname + '?mesa=' + encodeURIComponent(mesa);
    }

    function lerQuadro(video) {
        if (!video.videoWidth || typeof jsQR !== 'function') return '';
        const maximo = 480;
        const escala = Math.min(1, maximo / Math.max(video.videoWidth, video.videoHeight));
        const largura = Math.max(1, Math.round(video.videoWidth * escala));
        const altura = Math.max(1, Math.round(video.videoHeight * escala));
        const quadro = lerQuadro.canvas || (lerQuadro.canvas = document.createElement('canvas'));
        if (quadro.width !== largura) quadro.width = largura;
        if (quadro.height !== altura) quadro.height = altura;
        const ctx = quadro.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, largura, altura);
        const pixels = ctx.getImageData(0, 0, largura, altura);
        const code = jsQR(pixels.data, largura, altura, { inversionAttempts: 'dontInvert' });
        return code && code.data ? code.data : '';
    }

    async function lerQr() {
        const atual = ++leitura;
        const video = document.getElementById('cameraVideo');
        let detector = null;
        if ('BarcodeDetector' in window) {
            try { detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch (err) { detector = null; }
        }
        const passo = async () => {
            if (atual !== leitura || !state.escaneando) return;
            let outro = false;
            if (video && video.readyState >= 2) {
                try {
                    if (detector) {
                        const codes = await detector.detect(video);
                        const mesa = codes.map((code) => mesaDoQr(code.rawValue)).find(Boolean);
                        if (mesa) {
                            irParaMesa(mesa);
                            return;
                        }
                        outro = codes.length > 0;
                    } else {
                        const lido = lerQuadro(video);
                        const mesa = mesaDoQr(lido);
                        if (mesa) {
                            irParaMesa(mesa);
                            return;
                        }
                        outro = !!lido;
                    }
                } catch (err) {
                    /* o próximo quadro tenta de novo */
                }
            }
            if (outro) {
                state.erro = 'Esse QR não é de uma mesa. Aponte para o cartão da sua mesa.';
                const nota = document.querySelector('#app .note');
                if (nota) nota.textContent = state.erro;
            }
            if (atual === leitura) setTimeout(passo, 320);
        };
        passo();
    }

    async function ligarEscaneamento() {
        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            state.erro = 'Para escanear, abra esta página no celular, pelo Chrome ou Safari.';
            renderVazio();
            return;
        }
        if (!('BarcodeDetector' in window) && typeof jsQR !== 'function') {
            state.erro = 'Este navegador não lê o QR aqui. Aponte a câmera do celular para o cartão da mesa.';
            renderVazio();
            return;
        }
        state.facing = 'environment';
        const anterior = stream;
        try {
            const novo = await pedirStream();
            if (anterior && anterior !== novo) {
                anterior.getTracks().forEach((track) => track.stop());
            }
            stream = novo;
            state.camera = true;
            state.escaneando = true;
            state.erro = '';
            renderVazio();
            encaixarCamera();
            lerQr();
        } catch (err) {
            state.escaneando = false;
            state.erro = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
                ? 'Para escanear, permita o acesso à câmera quando o celular pedir.'
                : 'Não foi possível abrir a câmera. Aponte a câmera do celular para o QR do cartão.';
            renderVazio();
        }
    }

    function renderVazio() {
        const camera = state.escaneando ? `
            <div class="scan-stage">
                <video id="cameraVideo" autoplay muted playsinline></video>
                <div class="scan-frame" aria-hidden="true"></div>
            </div>
            <p class="scan-hint">Aponte para o QR da mesa</p>
            <button type="button" class="linkish" data-action="fechar-escanear">Fechar</button>` : `
            <button type="button" class="btn btn-scan" data-action="escanear">${iconeEscanear()}Escanear</button>`;
        app.innerHTML = `
            <span class="kicker">Desafio fotográfico</span>
            <h1 class="display">Sua missão</h1>
            <div class="gold-line"></div>
            <p class="lede">Escaneie o cartão da sua mesa para ver as cenas. Cada mesa tem um desafio diferente.</p>
            ${camera}
            ${state.erro ? `<p class="note">${D.esc(state.erro)}</p>` : ''}
            <a class="btn btn-ghost" href="album.html">Ver o álbum</a>`;
    }

    function render() {
        if (!state.mesa) {
            renderVazio();
            return;
        }
        if (state.view === 'captura') renderCaptura();
        else if (state.view === 'sucesso') renderSucesso();
        else renderLista();
        encaixarCamera();
    }

    app.addEventListener('click', (event) => {
        const alvo = event.target.closest('[data-action]');
        if (!alvo) return;
        if (!state.mesa) {
            if (alvo.dataset.action === 'escanear') ligarEscaneamento();
            if (alvo.dataset.action === 'fechar-escanear') {
                state.escaneando = false;
                state.erro = '';
                pararCamera();
                renderVazio();
            }
            return;
        }
        const acao = alvo.dataset.action;
        if (acao === 'lista') abrir('lista');
        if (acao === 'abrir') abrir('captura', alvo.dataset.id);
        if (acao === 'camera') ligarCamera();
        if (acao === 'disparar') disparar();
        if (acao === 'virar') {
            state.facing = state.facing === 'environment' ? 'user' : 'environment';
            ligarCamera();
        }
        if (acao === 'fechar-camera') {
            pararCamera();
            render();
        }
        if (acao === 'compartilhar') compartilharAgora();
        if (acao === 'proxima') {
            const seguinte = proxima(state.desafioId);
            if (seguinte) abrir('captura', seguinte.id);
            else abrir('lista');
        }
    });

    async function compartilharAgora() {
        if (state.compartilhando || state.view !== 'sucesso' || !state.publicacao) return;
        const base = state.publicacao;
        if (!(base.dataUrl || base.url)) return;
        state.compartilhando = true;
        const status = document.querySelector('.share-status');
        if (status) status.textContent = 'Preparando a foto…';
        try {
            const resultado = await D.publicar({
                dataUrl: base.dataUrl,
                url: base.url,
                titulo: base.titulo,
                legenda: base.legenda
            });
            state.shareMsg = resultado.cancelado ? '' : (resultado.mensagem || '');
            state.shareLink = resultado.cancelado ? '' : (resultado.link || '');
        } catch (err) {
            state.shareMsg = 'Não foi possível compartilhar agora.';
            state.shareLink = '';
        }
        state.compartilhando = false;
        render();
    }

    app.addEventListener('change', async (event) => {
        if (event.target.id !== 'arquivo' && event.target.id !== 'cameraNativa') return;
        const file = event.target.files && event.target.files[0];
        state.erro = '';
        if (!file) return;
        try {
            state.foto = await D.lerFoto(file);
        } catch (err) {
            state.foto = null;
            state.erro = D.mensagem(err.message);
        }
        render();
    });

    app.addEventListener('submit', async (event) => {
        if (event.target.id !== 'envio') return;
        event.preventDefault();
        const cena = cenaAtiva();
        if (!cena || !state.foto || state.enviando) return;
        const autor = event.target.autor.value;
        const legenda = event.target.legenda.value;
        D.setAutor(autor);
        state.enviando = true;
        state.erro = '';
        render();
        try {
            const result = await D.enviar({
                clientId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                mesa: state.mesa.id,
                desafioId: cena.id,
                desafioTitulo: cena.titulo,
                autor: autor.trim(),
                legenda: legenda.trim(),
                deviceId: D.deviceId(),
                dataUrl: state.foto.dataUrl,
                base64: state.foto.base64
            });
            if (result.foto) state.fotos = state.fotos.concat(result.foto);
            state.publicacao = {
                dataUrl: state.foto.dataUrl,
                url: result.foto && result.foto.url,
                titulo: cena.titulo,
                legenda: legenda.trim()
            };
            abrir('sucesso', cena.id);
        } catch (err) {
            state.enviando = false;
            state.erro = D.mensagem(err.message);
            render();
        }
    });

    async function iniciar() {
        try {
            state.data = await D.loadData();
        } catch (err) {
            app.innerHTML = '<p class="note">Não foi possível abrir as missões.</p>';
            return;
        }
        const id = D.mesaFromQuery();
        state.mesa = state.data.mesas.find((mesa) => mesa.id === id) || null;
        if (state.mesa && albumLink) albumLink.href = 'album.html?mesa=' + state.mesa.id;
        if (!state.mesa) {
            renderVazio();
            return;
        }
        try {
            const lista = await D.listar();
            state.fotos = lista.fotos || [];
        } catch (err) {
            state.fotos = [];
        }
        render();
    }

    window.addEventListener('pagehide', pararCamera);

    iniciar();
})();
