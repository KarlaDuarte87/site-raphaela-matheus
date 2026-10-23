(function () {
    const D = window.RMDesafio;
    const pilha = document.getElementById('cartoes');

    function heart() {
        return `<svg class="heart" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"/></svg>`;
    }

    function cartao(mesa) {
        const itens = mesa.desafios.map((cena) => `<li>${heart()}<span>${D.esc(cena.titulo)}</span></li>`).join('');
        return `
            <article class="card-wrap" data-mesa="${D.esc(mesa.id)}">
                <label class="card-flag no-print check">
                    <input type="checkbox" class="marca" checked>
                    Imprimir ${D.esc(mesa.nome)}
                </label>
                <section class="card">
                    <div class="card-body">
                        <div>
                            <img class="wordmark" src="../convite/assets/wordmark.png" alt="Raphaela & Matheus">
                            <h2>Sua missão</h2>
                            <p class="mesa-name">${D.esc(mesa.nome)}</p>
                            <ol>${itens}</ol>
                            <p class="card-date">01 · 11 · 2026</p>
                        </div>
                        <div class="card-side">
                            <img src="qr/mesa-${D.esc(mesa.id)}.png" alt="QR code da ${D.esc(mesa.nome)}">
                            <p>Aponte a câmera.<br>Sem aplicativo.<br>Marque<br>${D.esc(D.fraseMarcas()).replace(' e ', '<br>')}</p>
                        </div>
                    </div>
                    <footer class="card-credit">
                        <img src="qr/contato.png" alt="QR code do WhatsApp de Karla Duarte" width="180" height="180">
                        <p>
                            <span>Desenvolvido por Karla Duarte</span>
                            <span>(44) 98825-6734</span>
                        </p>
                    </footer>
                </section>
            </article>`;
    }

    document.getElementById('imprimir').addEventListener('click', () => {
        const filtrar = document.getElementById('soMarcadas').checked;
        document.querySelectorAll('.card-wrap').forEach((card) => {
            const marcado = card.querySelector('.marca').checked;
            card.classList.toggle('is-off', filtrar && !marcado);
        });
        window.print();
    });

    document.getElementById('todas').addEventListener('click', () => {
        const caixas = Array.from(document.querySelectorAll('.marca'));
        const marcar = caixas.some((caixa) => !caixa.checked);
        caixas.forEach((caixa) => { caixa.checked = marcar; });
    });

    D.loadData().then((data) => {
        pilha.innerHTML = data.mesas.map(cartao).join('');
    }).catch(() => {
        pilha.innerHTML = '<p class="note">Não foi possível montar os cartões.</p>';
    });
})();
