(function () {
    const LOCAL_KEY = 'rm-desafio-fotos';
    const LIKE_KEY = 'rm-desafio-curtidas';
    const DEVICE_KEY = 'rm-desafio-device';
    const AUTOR_KEY = 'rm-desafio-autor';

    const ERROS = {
        offline: 'Sem conexão. A foto continua no celular — tente de novo quando a internet voltar.',
        confirmacao: 'A foto saiu daqui, mas o álbum ainda não confirmou. Olhe o álbum antes de enviar outra vez.',
        grande: 'Essa foto está pesada demais. Tente outra.',
        tipo: 'Escolha uma foto.',
        ler: 'Não conseguimos ler essa foto. Tente tirar outra pela câmera.',
        memoria: 'A memória deste celular encheu no modo de ensaio.',
        imagem: 'Essa foto não pôde ser salva. Tente outra.',
        mesa: 'Não encontramos a mesa deste cartão.',
        desafio: 'Não encontramos esta cena.',
        lista: 'O álbum não respondeu agora.',
        rede: 'Não foi possível enviar agora. Tente de novo.',
        curtir: 'Não foi possível curtir agora. Tente de novo.'
    };

    function scriptUrl() {
        return String((window.DESAFIO && window.DESAFIO.scriptUrl) || '').trim();
    }

    function aoVivo() {
        return scriptUrl().startsWith('https://');
    }

    function deviceId() {
        let id = localStorage.getItem(DEVICE_KEY);
        if (!id) {
            id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
            localStorage.setItem(DEVICE_KEY, id);
        }
        return id;
    }

    function autor() {
        return localStorage.getItem(AUTOR_KEY) || '';
    }

    function setAutor(nome) {
        const limpo = String(nome || '').trim().slice(0, 80);
        if (limpo) localStorage.setItem(AUTOR_KEY, limpo);
    }

    function mensagem(codigo) {
        return ERROS[codigo] || ERROS.rede;
    }

    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    }

    function safeSrc(url) {
        if (typeof url !== 'string') return '';
        if (url.startsWith('data:image/jpeg;base64,')) return url;
        if (/^https:\/\/(lh3\.googleusercontent\.com|drive\.google\.com)\//.test(url)) return url;
        return '';
    }

    async function loadData() {
        const response = await fetch('desafios.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('lista');
        const data = await response.json();
        data.mesas.forEach((mesa) => {
            mesa.nome = 'Mesa ' + mesa.id;
            if (data.extra && !mesa.desafios.some((cena) => cena.id === 'extra')) {
                mesa.desafios = mesa.desafios.concat(data.extra);
            }
        });
        return data;
    }

    function mesaFromQuery() {
        const raw = new URLSearchParams(location.search).get('mesa') || '';
        return /^\d+$/.test(raw) ? raw.padStart(2, '0') : raw;
    }

    function readLocal() {
        try {
            const items = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
            return Array.isArray(items) ? items : [];
        } catch (err) {
            return [];
        }
    }

    function writeLocal(items) {
        const next = items.slice(-24);
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        } catch (err) {
            if (next.length > 1) {
                localStorage.setItem(LOCAL_KEY, JSON.stringify(next.slice(-8)));
                return;
            }
            throw new Error('memoria');
        }
    }

    function readLikes() {
        try {
            const items = JSON.parse(localStorage.getItem(LIKE_KEY) || '[]');
            return Array.isArray(items) ? items : [];
        } catch (err) {
            return [];
        }
    }

    function writeLikes(items) {
        localStorage.setItem(LIKE_KEY, JSON.stringify(items.slice(-500)));
    }

    function comCurtidas(fotos, rows) {
        const lista = Array.isArray(rows) ? rows : [];
        const meu = deviceId();
        return (fotos || []).map((foto) => {
            const delas = lista.filter((item) => item && item.fotoId === foto.id);
            return Object.assign({}, foto, {
                curtidas: Number.isFinite(foto.curtidas) ? Number(foto.curtidas) : delas.length,
                curtiu: typeof foto.curtiu === 'boolean' ? foto.curtiu : delas.some((item) => item.deviceId === meu)
            });
        });
    }

    function curtirLocal(fotoId) {
        const meu = deviceId();
        const rows = readLikes().filter((item) => item && item.fotoId && item.deviceId);
        const index = rows.findIndex((item) => item.fotoId === fotoId && item.deviceId === meu);
        const curtiu = index < 0;
        if (curtiu) rows.push({ fotoId, deviceId: meu });
        else rows.splice(index, 1);
        writeLikes(rows);
        return {
            ok: true,
            acao: 'curtir',
            fotoId,
            curtidas: rows.filter((item) => item.fotoId === fotoId).length,
            curtiu
        };
    }

    function jsonp(url) {
        return new Promise((resolve, reject) => {
            const callback = 'rmDesafio_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            const script = document.createElement('script');
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error('lista'));
            }, 20000);
            window[callback] = (data) => {
                cleanup();
                resolve(data);
            };
            function cleanup() {
                clearTimeout(timer);
                delete window[callback];
                script.remove();
            }
            script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callback;
            script.onerror = () => {
                cleanup();
                reject(new Error('lista'));
            };
            document.head.appendChild(script);
        });
    }

    async function listar() {
        if (!aoVivo()) {
            return { ok: true, aoVivo: false, pastaUrl: '', fotos: comCurtidas(readLocal(), readLikes()) };
        }
        const data = await jsonp(scriptUrl() + (scriptUrl().includes('?') ? '&' : '?') + 'acao=list&device=' + encodeURIComponent(deviceId()) + '&_=' + Date.now());
        if (!data || data.ok === false) throw new Error((data && data.erro) || 'lista');
        data.aoVivo = true;
        data.fotos = comCurtidas(Array.isArray(data.fotos) ? data.fotos : []);
        return data;
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('ler'));
            reader.readAsDataURL(blob);
        });
    }

    async function compress(file, maxSize, quality) {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        if (bitmap.close) bitmap.close();
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob) throw new Error('ler');
        const dataUrl = await blobToDataUrl(blob);
        return { dataUrl, base64: String(dataUrl).split(',')[1] || '' };
    }

    async function lerFoto(file) {
        if (!file || !String(file.type || '').startsWith('image/')) throw new Error('tipo');
        if (file.size > 25 * 1024 * 1024) throw new Error('grande');
        try {
            let foto = await compress(file, 1600, 0.82);
            if (foto.base64.length > 2800000) foto = await compress(file, 1280, 0.72);
            if (foto.base64.length > 3500000) throw new Error('grande');
            return foto;
        } catch (err) {
            if (err && ERROS[err.message]) throw err;
            throw new Error('ler');
        }
    }

    async function enviar(payload) {
        if (!aoVivo()) {
            const foto = {
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                clientId: payload.clientId,
                criadoEm: new Date().toISOString(),
                mesa: payload.mesa,
                desafioId: payload.desafioId,
                desafioTitulo: payload.desafioTitulo,
                autor: payload.autor,
                legenda: payload.legenda,
                url: payload.dataUrl,
                thumb: payload.dataUrl,
                deviceId: payload.deviceId
            };
            writeLocal(readLocal().concat(foto));
            return { ok: true, aoVivo: false, foto };
        }
        if (!navigator.onLine) throw new Error('offline');
        let result = null;
        try {
            const response = await fetch(scriptUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    clientId: payload.clientId,
                    mesa: payload.mesa,
                    desafioId: payload.desafioId,
                    desafioTitulo: payload.desafioTitulo,
                    autor: payload.autor,
                    legenda: payload.legenda,
                    deviceId: payload.deviceId,
                    imagem: payload.base64
                })
            });
            result = await response.json();
        } catch (err) {
            result = null;
        }
        if (result && result.ok && result.foto) return result;
        const achada = await confirmar(payload.clientId);
        if (achada) return { ok: true, aoVivo: true, foto: achada };
        throw new Error((result && result.erro) || 'confirmacao');
    }

    async function confirmar(clientId) {
        for (let tentativa = 0; tentativa < 6; tentativa += 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            try {
                const data = await listar();
                const foto = (data.fotos || []).find((item) => item.clientId === clientId);
                if (foto) return foto;
            } catch (err) {
                /* tenta de novo */
            }
        }
        return null;
    }

    function ranking(fotos) {
        return (fotos || [])
            .filter((foto) => Number(foto.curtidas) > 0)
            .slice()
            .sort((a, b) => Number(b.curtidas) - Number(a.curtidas) || String(b.criadoEm).localeCompare(String(a.criadoEm)))
            .slice(0, 8);
    }

    async function curtir(fotoId) {
        if (!aoVivo()) return curtirLocal(fotoId);
        let data = null;
        try {
            const response = await fetch(scriptUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ acao: 'curtir', fotoId, deviceId: deviceId() })
            });
            data = await response.json();
        } catch (err) {
            data = null;
        }
        if (!data || data.ok !== true || data.acao !== 'curtir') throw new Error('curtir');
        return data;
    }

    function textoSolto(valor) {
        return String(valor || '').replace(/[\u0000-\u001F]+/g, ' ').trim();
    }

    function marcasInstagram() {
        const lista = window.DESAFIO && Array.isArray(window.DESAFIO.instagram) ? window.DESAFIO.instagram : [];
        return lista.map((item) => {
            const bruto = textoSolto(item);
            const doLink = bruto.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
            const nome = (doLink ? doLink[1] : bruto).replace(/^@+/, '').replace(/[^\w.]/g, '');
            return nome ? '@' + nome : '';
        }).filter(Boolean);
    }

    function fraseMarcas() {
        const marcas = marcasInstagram();
        if (marcas.length === 1) return marcas[0];
        if (marcas.length > 1) return marcas.slice(0, -1).join(', ') + ' e ' + marcas[marcas.length - 1];
        return 'Raphaela e Matheus';
    }

    function textoPublicacao(foto) {
        const convite = 'Marquem ' + fraseMarcas() + '.';
        const linhas = ['Casamento de Raphaela e Matheus · 01.11.2026'];
        const cena = textoSolto(foto && (foto.desafioTitulo || foto.titulo));
        const fala = textoSolto(foto && foto.legenda);
        if (cena) linhas.push(cena);
        if (fala) linhas.push(fala);
        linhas.push('', convite, '#RaphaelaEMatheus');
        return linhas.join('\n');
    }

    function copiarTexto(texto) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(texto).then(() => true).catch(() => copiarSelecao(texto));
        }
        return Promise.resolve(copiarSelecao(texto));
    }

    function copiarSelecao(texto) {
        const area = document.createElement('textarea');
        area.value = texto;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        area.remove();
        return ok;
    }

    async function obterArquivo(foto) {
        const src = safeSrc(foto && foto.dataUrl) || safeSrc(foto && foto.url) || safeSrc(foto && foto.thumb);
        if (!src) return null;
        try {
            const response = await fetch(src);
            if (!response.ok) return null;
            const blob = await response.blob();
            if (!String(blob.type || '').startsWith('image/')) return null;
            return new File([blob], 'raphaela-e-matheus.jpg', { type: blob.type || 'image/jpeg' });
        } catch (err) {
            return null;
        }
    }

    function arquivoLocal(dataUrl) {
        if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
        const partes = dataUrl.split(',');
        if (partes.length < 2) return null;
        const mime = (partes[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
        const binario = atob(partes[1]);
        const bytes = new Uint8Array(binario.length);
        for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
        return new File([bytes], 'raphaela-e-matheus.jpg', { type: mime });
    }

    async function publicar(foto) {
        const texto = textoPublicacao(foto);
        const aviso = 'Legenda copiada. Cole no Instagram, no WhatsApp ou no Facebook e marque ' + fraseMarcas() + '.';
        let arquivo = arquivoLocal(foto && foto.dataUrl);
        if (!arquivo) arquivo = await obterArquivo(foto);
        if (navigator.share) {
            const pacote = { text: texto, title: 'Raphaela & Matheus' };
            if (arquivo && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
                pacote.files = [arquivo];
            }
            try {
                await navigator.share(pacote);
                copiarTexto(texto);
                return { ok: true, mensagem: aviso };
            } catch (err) {
                if (err && err.name === 'AbortError') return { ok: false, cancelado: true };
            }
        }
        const copiou = await copiarTexto(texto);
        return {
            ok: true,
            link: 'https://wa.me/?text=' + encodeURIComponent(texto),
            mensagem: copiou
                ? 'Legenda copiada. No celular, o botão abre Instagram, WhatsApp e Facebook. Aqui, abra o WhatsApp ou cole o texto na publicação e marque ' + fraseMarcas() + '.'
                : 'Abra o WhatsApp e marque ' + fraseMarcas() + '.'
        };
    }

    function minhas(fotos, mesa, desafioId) {
        return (fotos || []).filter((foto) => (
            foto.mesa === mesa &&
            foto.desafioId === desafioId &&
            foto.deviceId === deviceId()
        ));
    }

    window.RMDesafio = {
        aoVivo,
        autor,
        setAutor,
        deviceId,
        mensagem,
        esc,
        safeSrc,
        loadData,
        mesaFromQuery,
        listar,
        lerFoto,
        enviar,
        ranking,
        curtir,
        minhas,
        publicar,
        fraseMarcas
    };
})();
