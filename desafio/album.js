(function () {
    const D = window.RMDesafio;
    const app = document.getElementById('app');
    const lightbox = document.getElementById('lightbox');
    const missaoLink = document.getElementById('missaoLink');

    const state = {
        fotos: [],
        conhecidas: new Set(),
        filtro: 'todas',
        aoVivo: false,
        erro: '',
        indice: 0,
        primeira: true,
        pendentes: new Set()
    };

    const recortes = new Map();
    const emCurso = new Map();

    function origem(foto) {
        return D.safeSrc(foto.url) || D.safeSrc(foto.thumb) || '';
    }

    function srcVisivel(foto) {
        const cache = recortes.get(foto.id);
        return cache || origem(foto);
    }

    async function aplicarEnquadramento(img) {
        const id = img && img.dataset.foto;
        const src = img && img.dataset.origem;
        if (!id || !src) return;
        if (recortes.has(id)) {
            const cache = recortes.get(id);
            if (cache) document.querySelectorAll('[data-foto="' + id + '"]').forEach((el) => {
                if (el.src !== cache) el.src = cache;
            });
            return;
        }
        if (!emCurso.has(id)) {
            const tarefa = D.enquadrarUrl(src).then((url) => {
                recortes.set(id, url || '');
                return url || '';
            }).catch(() => {
                recortes.set(id, '');
                return '';
            }).finally(() => emCurso.delete(id));
            emCurso.set(id, tarefa);
        }
        const url = await emCurso.get(id);
        if (!url) return;
        document.querySelectorAll('[data-foto="' + id + '"]').forEach((el) => {
            if (el.src !== url) el.src = url;
        });
    }

    function observarFotos(raiz) {
        raiz.querySelectorAll('img[data-foto]').forEach((img) => aplicarEnquadramento(img));
    }

    const mesaQuery = D.mesaFromQuery();
    if (mesaQuery && missaoLink) missaoLink.href = 'index.html?mesa=' + mesaQuery;

    function visiveis() {
        const fotos = state.fotos.slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
        if (state.filtro === 'todas') return fotos;
        return fotos.filter((foto) => foto.mesa === state.filtro);
    }

    function coracao(cheio) {
        const estilo = cheio
            ? 'fill="currentColor"'
            : 'fill="none" stroke="currentColor" stroke-width="1.7"';
        return `<svg class="heart-icon" viewBox="0 0 24 24" aria-hidden="true" ${estilo}><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"></path></svg>`;
    }

    function rotuloCurtidas(total) {
        const n = Number(total) || 0;
        return n === 1 ? '1 curtida' : n + ' curtidas';
    }

    function fotoAberta() {
        return visiveis()[state.indice] || null;
    }

    function pintarCurtida(foto) {
        const botao = document.getElementById('lightboxLike');
        if (!botao || !foto) return;
        botao.classList.toggle('is-on', !!foto.curtiu);
        botao.setAttribute('aria-pressed', foto.curtiu ? 'true' : 'false');
        botao.setAttribute('aria-label', foto.curtiu ? 'Remover curtida' : 'Curtir foto');
        botao.innerHTML = coracao(!!foto.curtiu) + `<span>${Number(foto.curtidas) || 0}</span>`;
    }

    function meta(foto) {
        const partes = [];
        if (foto.autor) partes.push(foto.autor);
        if (foto.mesa) partes.push('Mesa ' + foto.mesa);
        if (foto.legenda) partes.push(foto.legenda);
        return partes.join(' · ');
    }

    function render() {
        const fotos = visiveis();
        const mesas = Array.from(new Set(state.fotos.map((foto) => foto.mesa).filter(Boolean))).sort();
        const chips = ['todas'].concat(mesas).map((id) => {
            const rotulo = id === 'todas' ? 'Todas' : 'Mesa ' + id;
            return `<button type="button" class="chip${state.filtro === id ? ' is-on' : ''}" data-filtro="${D.esc(id)}">${rotulo}</button>`;
        }).join('');
        const aviso = state.aoVivo
            ? ''
            : '<p class="banner">Modo de ensaio neste celular. Quando o Google Drive estiver ligado, as fotos de todos os convidados aparecem aqui.</p>';
        const grade = fotos.length
            ? `<div class="gallery">${fotos.map((foto, index) => {
                const src = srcVisivel(foto);
                const nova = !state.primeira && !state.conhecidas.has(foto.id);
                return `
                    <article class="shot${nova ? ' is-new' : ''}">
                        <button type="button" class="shot-open" data-index="${index}">
                            <img src="${D.esc(src)}" data-foto="${D.esc(foto.id)}" data-origem="${D.esc(origem(foto))}" alt="${D.esc(foto.desafioTitulo || 'Foto da festa')}" ${foto.thumb ? `data-fallback="${D.esc(D.safeSrc(foto.thumb))}"` : ''} loading="lazy" decoding="async">
                            <span class="shot-copy">
                                <h3>${D.esc(foto.desafioTitulo || 'Cena da festa')}</h3>
                                <p>${D.esc(meta(foto))}</p>
                            </span>
                        </button>
                        <button type="button" class="like${foto.curtiu ? ' is-on' : ''}" data-curtir="${D.esc(foto.id)}" aria-pressed="${foto.curtiu ? 'true' : 'false'}" aria-label="${foto.curtiu ? 'Remover curtida' : 'Curtir foto'}">${coracao(!!foto.curtiu)}<span>${Number(foto.curtidas) || 0}</span></button>
                    </article>`;
            }).join('')}</div>`
            : `<div class="empty"><strong>O álbum espera a festa</strong><p>Cada foto enviada pelos convidados aparece aqui.</p></div>`;
        const rank = D.ranking(state.fotos);
        const classificacao = fotos.length
            ? `<section class="ranking"><span class="kicker">Mais curtidas</span>${rank.length
                ? `<ol>${rank.map((foto, index) => `
                    <li><button type="button" data-foto="${D.esc(foto.id)}"><span>${index + 1}º</span><strong>${D.esc(foto.desafioTitulo || 'Cena da festa')}</strong><em>${rotuloCurtidas(foto.curtidas)}</em></button></li>
                `).join('')}</ol>`
                : '<p class="hint">Toque no coração para curtir uma foto.</p>'}</section>`
            : '';
        const total = state.fotos.length;

        app.innerHTML = `
            ${aviso}
            <div>
                <span class="live${state.aoVivo ? '' : ' is-off'}"><i></i> ${state.aoVivo ? 'Ao vivo' : 'Ensaio'}</span>
                <h1 class="page-title">O álbum de vocês</h1>
                <div class="gold-line"></div>
                <p class="lede">Cada foto capturada na festa cai aqui. Abra uma imagem para publicar e marcar ${D.esc(D.fraseMarcas())}.</p>
                <p class="progress-label">${total} ${total === 1 ? 'recordação' : 'recordações'}${state.erro ? ' · ' + D.esc(state.erro) : ''}</p>
            </div>
            <div class="filters">${chips}</div>
            ${grade}
            ${classificacao}`;

        state.conhecidas = new Set(state.fotos.map((foto) => foto.id));
        state.primeira = false;
        observarFotos(app);
    }

    function abrirLightbox(index) {
        const fotos = visiveis();
        if (!fotos.length) return;
        state.indice = (index + fotos.length) % fotos.length;
        const foto = fotos[state.indice];
        const img = document.getElementById('lightboxImg');
        const pronta = recortes.get(foto.id);
        img.dataset.foto = foto.id;
        img.dataset.origem = origem(foto);
        img.alt = foto.desafioTitulo || 'Foto da festa';
        img.removeAttribute('crossorigin');
        img.src = pronta || origem(foto);
        aplicarEnquadramento(img);
        document.getElementById('lightboxTitulo').textContent = foto.desafioTitulo || 'Cena da festa';
        document.getElementById('lightboxMeta').textContent = meta(foto);
        const aviso = document.getElementById('lightboxShare');
        if (aviso) aviso.textContent = '';
        const whats = document.getElementById('lightboxWa');
        if (whats) whats.remove();
        pintarCurtida(foto);
        lightbox.hidden = false;
    }

    app.addEventListener('click', (event) => {
        const curtirBtn = event.target.closest('[data-curtir]');
        if (curtirBtn) {
            event.preventDefault();
            alternar(curtirBtn.dataset.curtir);
            return;
        }
        const chip = event.target.closest('[data-filtro]');
        if (chip) {
            state.filtro = chip.dataset.filtro;
            render();
            return;
        }
        const ranked = event.target.closest('[data-foto]');
        if (ranked) {
            const index = visiveis().findIndex((foto) => foto.id === ranked.dataset.foto);
            if (index >= 0) abrirLightbox(index);
            return;
        }
        const shot = event.target.closest('[data-index]');
        if (shot) abrirLightbox(Number(shot.dataset.index));
    });

    document.addEventListener('error', (event) => {
        const img = event.target;
        if (!(img instanceof HTMLImageElement) || !img.dataset.foto) return;
        const fallback = img.dataset.fallback;
        if (fallback && img.src !== fallback) img.src = fallback;
    }, true);

    lightbox.addEventListener('click', (event) => {
        const acao = event.target.closest('[data-action]');
        if (!acao) return;
        if (acao.dataset.action === 'fechar') lightbox.hidden = true;
        if (acao.dataset.action === 'anterior') abrirLightbox(state.indice - 1);
        if (acao.dataset.action === 'proxima') abrirLightbox(state.indice + 1);
        if (acao.dataset.action === 'compartilhar') compartilharFoto();
        if (acao.dataset.action === 'curtir') {
            const foto = fotoAberta();
            if (foto) alternar(foto.id);
        }
    });

    async function alternar(id) {
        if (!id || state.pendentes.has(id)) return;
        const foto = state.fotos.find((item) => item.id === id);
        if (!foto) return;
        const antes = { curtidas: Number(foto.curtidas) || 0, curtiu: !!foto.curtiu };
        state.pendentes.add(id);
        foto.curtiu = !antes.curtiu;
        foto.curtidas = Math.max(0, antes.curtidas + (foto.curtiu ? 1 : -1));
        const aberto = !lightbox.hidden;
        render();
        if (aberto) pintarCurtida(fotoAberta());
        try {
            const resultado = await D.curtir(id);
            foto.curtidas = Number(resultado.curtidas) || 0;
            foto.curtiu = !!resultado.curtiu;
            state.erro = '';
        } catch (err) {
            foto.curtidas = antes.curtidas;
            foto.curtiu = antes.curtiu;
            state.erro = D.mensagem('curtir');
        }
        state.pendentes.delete(id);
        render();
        if (!lightbox.hidden) pintarCurtida(fotoAberta());
    }

    async function compartilharFoto() {
        const foto = visiveis()[state.indice];
        const aviso = document.getElementById('lightboxShare');
        if (!foto || !aviso) return;
        aviso.textContent = 'Preparando a foto…';
        const antigo = document.getElementById('lightboxWa');
        if (antigo) antigo.remove();
        try {
            const resultado = await D.publicar(foto);
            if (resultado.cancelado) {
                aviso.textContent = '';
                return;
            }
            aviso.textContent = resultado.mensagem || '';
            if (resultado.link) {
                const link = document.createElement('a');
                link.id = 'lightboxWa';
                link.className = 'linkish';
                link.href = resultado.link;
                link.target = '_blank';
                link.rel = 'noopener';
                link.textContent = 'Abrir no WhatsApp';
                aviso.insertAdjacentElement('afterend', link);
            }
        } catch (err) {
            aviso.textContent = 'Não foi possível compartilhar agora.';
        }
    }

    document.addEventListener('keydown', (event) => {
        if (lightbox.hidden) return;
        if (event.key === 'Escape') lightbox.hidden = true;
        if (event.key === 'ArrowLeft') abrirLightbox(state.indice - 1);
        if (event.key === 'ArrowRight') abrirLightbox(state.indice + 1);
    });

    async function atualizar() {
        if (document.hidden) return;
        try {
            const data = await D.listar();
            state.fotos = (data.fotos || []).map((foto) => {
                if (!state.pendentes.has(foto.id)) return foto;
                const local = state.fotos.find((item) => item.id === foto.id);
                return local ? Object.assign({}, foto, { curtidas: local.curtidas, curtiu: local.curtiu }) : foto;
            });
            state.aoVivo = Boolean(data.aoVivo);
            state.erro = state.pendentes.size ? state.erro : '';
        } catch (err) {
            state.erro = 'sem atualizar agora';
        }
        const aberto = !lightbox.hidden;
        const idAberto = aberto && fotoAberta() ? fotoAberta().id : '';
        render();
        if (!aberto) return;
        const index = visiveis().findIndex((foto) => foto.id === idAberto);
        if (index < 0) {
            lightbox.hidden = true;
            return;
        }
        state.indice = index;
        pintarCurtida(visiveis()[index]);
    }

    atualizar();
    setInterval(atualizar, 12000);
})();
