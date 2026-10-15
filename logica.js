/* ==========================================================================
   PORTAL DE CONTROLE DE QUALIDADE - AMIGOS DO BEM
   logica.js - Completo com Textos Dinâmicos de Modais Ajustados
   ========================================================================== */

// 1. INICIALIZAÇÃO FIREBASE (PROTEGIDA CONTRA REINICIALIZAÇÃO)


let db = null;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps || !firebase.apps.length) {
           
        }
        db = firebase.firestore();
    }
} catch (e) {
    console.warn("Firebase offline ou em espera:", e);
}

let ultimoResultadoCalculado = null;
let mapaFornecedoresOrigem = {};

// 2. TEXTOS TÉCNICOS DOS MODAIS (CORRIGIDOS E INDIVIDUAIS)
const informacoesQualidade = {
    'W2': { 
        titulo: 'Padrão Técnico W2 (Sadias sem casca)', 
        texto: 'Amêndoas de caju perfeitamente sadias, inteiras, maduras, de cor marfim uniforme e totalmente livres de películas residuais ou mofo.' 
    },
    'W3': { 
        titulo: 'Padrão Técnico W3 (Imaturas ou picadas com casca)', 
        texto: 'Castanhas com casca que, após a abertura e inspeção, revelam amêndoas picadas por pragas ou atrofia imatura de colheita precoce.' 
    },
    'W4': { 
        titulo: 'Padrão Técnico W4 (Amêndoas imaturas ou picadas sem casca)', 
        texto: 'Amêndoas extraídas que se apresentam murchas, enrugadas ou com pontos escuros e necrose superficial decorrentes de pragas.' 
    },
    'W5': { 
        titulo: 'Padrão Técnico W5 (Castanhas rejeitadas com casca)', 
        texto: 'Compreende os 5 tipos de defeitos graves do manual ComCashew que inviabilizam o aproveitamento industrial da castanha.' 
    }
};

// 3. FUNÇÃO QUE ABRE O MODAL INFORMATIVO (W2 A W5) COM TEXTOS DINÂMICOS CORRIGIDOS
window.abrirJanelaInfo = function(parametro) {
    const dados = informacoesQualidade[parametro];
    if (!dados) return;

    const modal = document.getElementById('janelaModalInfo');
    const container = document.getElementById('modalContainer');
    const titulo = document.getElementById('modalTitulo');
    const texto = document.getElementById('modalTexto');

    // Atualiza título e texto dinamicamente de acordo com o botão clicado
    if (titulo) titulo.innerText = dados.titulo;
    if (texto) texto.innerText = dados.texto;
    
    const painelW2 = document.getElementById('painel_W2');
    const painelW3W4 = document.getElementById('painel_W3_W4');
    const painelW5 = document.getElementById('painel_W5');
    
    if (painelW2) painelW2.style.display = 'none';
    if (painelW3W4) painelW3W4.style.display = 'none';
    if (painelW5) painelW5.style.display = 'none';
    
    if (parametro === 'W5') {
        if (container) container.classList.add('wide');
        if (painelW5) painelW5.style.display = 'flex';
    } else {
        if (container) container.classList.remove('wide');
        if (parametro === 'W2' && painelW2) {
            painelW2.style.display = 'flex';
        } else if ((parametro === 'W3' || parametro === 'W4') && painelW3W4) {
            painelW3W4.style.display = 'flex';
        }
    }
    
    if (modal) modal.style.display = 'flex';
};

window.fecharJanelaInfo = function() {
    const modal = document.getElementById('janelaModalInfo');
    if (modal) modal.style.display = 'none';
};

window.encerrarSessao = function() {
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().then(() => {
                window.location.replace('login.html');
            }).catch(() => {
                window.location.replace('index.html');
            });
            return;
        }
    } catch (e) {}
    window.location.replace('index.html');
};

// 4. CARREGAMENTO DOS FORNECEDORES NO SELECT
async function carregarDropdownFornecedores() {
    const select = document.getElementById('fornecedor');
    if (!select) return;

    const listaPadrao = [
        { nome: "Cooperativa Mauriti", origem: "Mauriti - CE" },
        { nome: "Produtores Associados", origem: "Região do Cariri - CE" },
        { nome: "Fazenda Boa Esperança", origem: "Mauriti - CE" },
        { nome: "Fornecedor Geral Externo", origem: "Nordeste - BR" }
    ];

    function preencherHtml(itens) {
        mapaFornecedoresOrigem = {};
        let options = '<option value="">-- Selecione o Fornecedor --</option>';
        itens.forEach(f => {
            mapaFornecedoresOrigem[f.nome] = f.origem;
            options += `<option value="${f.nome}">${f.nome} (${f.origem})</option>`;
        });
        select.innerHTML = options;
    }

    preencherHtml(listaPadrao);

    if (db) {
        try {
            const snapshot = await db.collection("fornecedores").orderBy("nome", "asc").get();
            if (!snapshot.empty) {
                const itensNuvem = [];
                snapshot.docs.forEach(doc => {
                    const f = doc.data();
                    const origemTexto = f.cidade && f.estado ? `${f.cidade} - ${f.estado}` : (f.regiao || "CE");
                    itensNuvem.push({ nome: f.nome, origem: origemTexto });
                });
                preencherHtml(itensNuvem);
            }
        } catch (err) {
            console.warn("Usando lista local de fornecedores:", err);
        }
    }

    select.addEventListener('change', function () {
        const origemInput = document.getElementById('origem');
        if (origemInput && mapaFornecedoresOrigem[this.value]) {
            origemInput.value = mapaFornecedoresOrigem[this.value];
        }
    });
}

// 5. CÁLCULO INDUSTRIAL OFICIAL COM REAVALIAÇÃO COMERCIAL INTEGRADA
window.processarAmostraUnica = function() {
    try {
        const pbInput = document.getElementById('pBruto');
        const contagemInput = document.getElementById('contagem');
        const w2Input = document.getElementById('w2');
        const w3Input = document.getElementById('w3');
        const w4Input = document.getElementById('w4');
        const w5Input = document.getElementById('w5');
        const umidadeInput = document.getElementById('umidade');

        if (!pbInput || pbInput.value.trim() === "" ||
            !contagemInput || contagemInput.value.trim() === "" ||
            !w2Input || w2Input.value.trim() === "" ||
            !w3Input || w3Input.value.trim() === "" ||
            !w4Input || w4Input.value.trim() === "" ||
            !w5Input || w5Input.value.trim() === "" ||
            !umidadeInput || umidadeInput.value.trim() === "") {
            
            alert("⚠️ Atenção: Todos os parâmetros do Teste Preliminar devem ser preenchidos.");
            return;
        }

        const pb = parseFloat(pbInput.value);
        const contagem = parseInt(contagemInput.value);
        const w2 = parseFloat(w2Input.value);
        const w3 = parseFloat(w3Input.value);
        const w4 = parseFloat(w4Input.value);
        const w5 = parseFloat(w5Input.value);
        const umidade = parseFloat(umidadeInput.value);

        if (isNaN(pb) || pb < 998 || pb > 1002) {
            alert("⚠️ Erro de Calibração da Amostra (W1): Deve estar entre 998g e 1002g.");
            pbInput.focus();
            return;
        }

        if (contagem <= 0 || w2 < 0 || w3 < 0 || w4 < 0 || w5 < 0 || umidade < 0) {
            alert("⚠️ Por favor, insira valores válidos e positivos.");
            return;
        }

        // 1. Total Defective Ratio (TDR)
        const tdrFraction = ((w3 * 0.5) + w5) / pb;
        const tdrPercent = tdrFraction * 100;

        // 2. Kernel Output Ratio (KOR) - Padrão Internacional Exato ACA
        const massaUtil = w2 + (w4 * 0.5);
        const korFraction = massaUtil / pb; 
        const FATOR_KOR_ACA = 80 / 0.45359237; 
        const korLbs = korFraction * FATOR_KOR_ACA;

        // 3. Nut Count (Frutos por kg)
        const nutCountPorKg = (contagem / pb) * 1000;

        // Atualização dos Cards
        const tdrEl = document.getElementById('tdrValue');
        const tdrBadge = document.getElementById('tdrStatus');
        if (tdrEl) tdrEl.innerText = tdrPercent.toFixed(2) + "%";

        const tdrAprovado = tdrPercent <= 24.0;
        if (tdrEl && tdrBadge) {
            if (tdrAprovado) {
                tdrEl.className = "aca-main-value text-green";
                tdrBadge.className = "aca-status-badge badge-green";
                tdrBadge.innerText = "(Aceitável)";
            } else {
                tdrEl.className = "aca-main-value text-red";
                tdrBadge.className = "aca-status-badge badge-red";
                tdrBadge.innerText = "(Rejeitado)";
            }
        }

        const korEl = document.getElementById('korValue');
        const korBadge = document.getElementById('korStatus');
        if (korEl) korEl.innerText = korLbs.toFixed(2) + " lb";

        const korAprovado = korLbs >= 43.0;
        if (korEl && korBadge) {
            if (korLbs >= 49.0) {
                korEl.className = "aca-main-value text-blue";
                korBadge.className = "aca-status-badge badge-blue";
                korBadge.innerText = "(Excelente)";
            } else if (korLbs >= 47.0) {
                korEl.className = "aca-main-value text-green";
                korBadge.className = "aca-status-badge badge-green";
                korBadge.innerText = "(Bom)";
            } else if (korLbs >= 43.0) {
                korEl.className = "aca-main-value text-yellow";
                korBadge.className = "aca-status-badge badge-yellow";
                korBadge.innerText = "(Aceitável)";
            } else {
                korEl.className = "aca-main-value text-red";
                korBadge.className = "aca-status-badge badge-red";
                korBadge.innerText = "(Baixo / Pobre)";
            }
        }

        const moistEl = document.getElementById('moistureValue');
        const moistBadge = document.getElementById('moistureStatus');
        let umidadeStatus = "indefinida";

        if (moistEl && moistBadge) {
            moistEl.innerText = umidade.toFixed(1) + "%";
            if (umidade > 15.0) {
                moistEl.className = "aca-main-value text-red";
                moistBadge.className = "aca-status-badge badge-red";
                moistBadge.innerText = "PÉSSIMO (Não receber)";
                umidadeStatus = "critica";
            } else if (umidade >= 13.0) {
                moistEl.className = "aca-main-value text-red";
                moistBadge.className = "aca-status-badge badge-red";
                moistBadge.innerText = "RUIM (Secagem prioritária)";
                umidadeStatus = "alerta";
            } else if (umidade >= 10.0) {
                moistEl.className = "aca-main-value text-yellow";
                moistBadge.className = "aca-status-badge badge-yellow";
                moistBadge.innerText = "REGULAR (Secar antes do estoque)";
                umidadeStatus = "alerta";
            } else if (umidade >= 8.0) {
                moistEl.className = "aca-main-value text-green";
                moistBadge.className = "aca-status-badge badge-green";
                moistBadge.innerText = "BOM (Receber e avaliar)";
                umidadeStatus = "boa";
            } else if (umidade >= 6.0) {
                moistEl.className = "aca-main-value text-green";
                moistBadge.className = "aca-status-badge badge-green";
                moistBadge.innerText = "ÓTIMA (Armazenar)";
                umidadeStatus = "otima";
            } else {
                moistEl.className = "aca-main-value text-yellow";
                moistBadge.className = "aca-status-badge badge-yellow";
                moistBadge.innerText = "ATENÇÃO (Oleosidade)";
                umidadeStatus = "seca";
            }
        }

        const sizeEl = document.getElementById('sizeValue');
        const sizeBadge = document.getElementById('sizeStatus');
        let tamanhoStatus = "normal";

        if (sizeEl && sizeBadge) {
            sizeEl.innerText = `${nutCountPorKg.toFixed(0)} un/kg`;
            if (nutCountPorKg <= 115) {
                sizeEl.className = "aca-main-value text-blue";
                sizeBadge.className = "aca-status-badge badge-blue";
                sizeBadge.innerText = "Tipo G (GRANDE >24mm)";
            } else if (nutCountPorKg <= 180) {
                sizeEl.className = "aca-main-value text-green";
                sizeBadge.className = "aca-status-badge badge-green";
                sizeBadge.innerText = "Tipo M-2 (MÉDIA-2 22-24mm)";
            } else if (nutCountPorKg <= 300) {
                sizeEl.className = "aca-main-value text-yellow";
                sizeBadge.className = "aca-status-badge badge-yellow";
                sizeBadge.innerText = "Tipo M-1 (MÉDIA-1 20-22mm)";
                if (nutCountPorKg > 240) tamanhoStatus = "alerta";
            } else {
                sizeEl.className = "aca-main-value text-red";
                sizeBadge.className = "aca-status-badge badge-red";
                sizeBadge.innerText = "Tipo P2 (PEQUENA 17-19mm)";
                tamanhoStatus = "rejeitado";
            }
        }

        // Avaliação de Veredicto e Alerta de Reavaliação Comercial
        const banner = document.getElementById('bannerVeredicto');
        const vTitulo = document.getElementById('veredictoTitulo');
        const vDetalhe = document.getElementById('veredictoDetalhe');
        const fAcao = document.getElementById('fAcaoOperacional');

        let motivosRejeicao = [];
        if (!korAprovado) motivosRejeicao.push(`Rendimento KOR insuficiente (${korLbs.toFixed(2)} lb < 43 lb)`);
        if (!tdrAprovado) motivosRejeicao.push(`Excesso de defeitos TDR (${tdrPercent.toFixed(1)}% > 24%)`);
        if (umidadeStatus === "critica") motivosRejeicao.push(`Umidade excessiva (${umidade.toFixed(1)}% > 15%)`);
        if (tamanhoStatus === "rejeitado") motivosRejeicao.push(`Calibre inviável (${nutCountPorKg.toFixed(0)} un/kg > 300 un/kg)`);

        let exigenciaComercial = "";
        if (motivosRejeicao.length === 0 && (umidadeStatus === "alerta" || tamanhoStatus === "alerta" || korLbs < 47.0)) {
            exigenciaComercial = " | 💰 REAVALIAÇÃO COMERCIAL: Necessário repactuar valor por desvio de KOR/umidade.";
        }

        if (banner && vTitulo && vDetalhe) {
            if (motivosRejeicao.length > 0) {
                banner.className = "veredicto-banner banner-rejeitado";
                vTitulo.innerText = "❌ LOTE REJEITADO";
                vDetalhe.innerText = "Motivo: " + motivosRejeicao.join(" | ");
                if (fAcao) fAcao.innerText = "Recusar recebimento ou direcionar para descarte fabril / subprodutos.";
            } else if (umidadeStatus === "alerta" || tamanhoStatus === "alerta" || korLbs < 47.0) {
                banner.className = "veredicto-banner banner-condicional";
                vTitulo.innerText = "⚠️ RECEBIMENTO CONDICIONAL";
                let detalheMsg = "Lote aceite sob condições técnicas de ajuste.";
                if (umidadeStatus === "alerta") detalheMsg = "Umidade acima do ideal (exige secagem prévia).";
                if (korLbs < 47.0) detalheMsg = `Rendimento KOR (${korLbs.toFixed(2)} lb) abaixo da faixa ótima (>47 lb).`;
                vDetalhe.innerText = detalheMsg + exigenciaComercial;
                if (fAcao) fAcao.innerText = "Direcionar para secagem prévia / Aplicar reavaliação comercial de preço.";
            } else {
                banner.className = "veredicto-banner banner-aprovado";
                vTitulo.innerText = "✅ LOTE APROVADO";
                vDetalhe.innerText = "Carga em conformidade total com os parâmetros industriais e de armazenagem.";
                if (fAcao) fAcao.innerText = "Apta para pesagem final, ensacamento e estocagem imediata.";
            }
        }

        // Rodapé de Métricas
        const fornSelect = document.getElementById('fornecedor');
        const fornNome = (fornSelect && fornSelect.value) ? fornSelect.value : "Não selecionado";
        const nfVal = document.getElementById('nf') ? document.getElementById('nf').value.trim() : "S/N";

        const acaHeader = document.getElementById('acaHeaderInfo');
        const fMassa = document.getElementById('fMassaUtil');
        const fKor = document.getElementById('fKorPerc');

        if (acaHeader) acaHeader.innerText = `${fornNome} | NF: ${nfVal}`;
        if (fMassa) fMassa.innerText = `${massaUtil.toFixed(1)} g`;
        if (fKor) fKor.innerText = `${(korFraction * 100).toFixed(1)}%`;

        ultimoResultadoCalculado = {
            pesoBruto: pb,
            contagem: contagem,
            tdrPercent: Number(tdrPercent.toFixed(2)),
            korLbs: Number(korLbs.toFixed(2)),
            umidade: Number(umidade.toFixed(1)),
            nutCount: Number(nutCountPorKg.toFixed(0)),
            veredictoTitulo: vTitulo ? vTitulo.innerText : "",
            veredictoDetalhe: vDetalhe ? vDetalhe.innerText : "",
            statusClasse: motivosRejeicao.length > 0 ? "rejeitado" : ((umidadeStatus === "alerta" || tamanhoStatus === "alerta" || korLbs < 47.0) ? "condicional" : "aprovado")
        };

        const btnSalvar = document.getElementById('btnSalvar');
        if (btnSalvar) {
            btnSalvar.style.display = 'block';
            btnSalvar.innerText = "💾 Salvar Análise na Nuvem";
            btnSalvar.disabled = false;
            btnSalvar.style.backgroundColor = "#27ae60";
        }

        const painel = document.getElementById('painelVeredicto');
        if (painel) {
            painel.style.display = 'block';
            painel.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (erro) {
        console.error("Erro no processamento:", erro);
        alert("Ocorreu um erro ao calcular.");
    }
};

// 6. GRAVAÇÃO NO BANCO DE DADOS
window.salvarAnaliseNoBanco = async function() {
    if (!ultimoResultadoCalculado) {
        alert("⚠️ Por favor, calcule a qualidade do lote antes de salvar!");
        return;
    }

    const fornSelect = document.getElementById('fornecedor');
    const origemInput = document.getElementById('origem');
    const dataInput = document.getElementById('dataRecebimento');
    const qtdInput = document.getElementById('quantidade');
    const nfInput = document.getElementById('nf');

    const forn = fornSelect ? fornSelect.value.trim() : "";
    const origem = origemInput ? origemInput.value.trim() : "";
    const dataRec = dataInput ? dataInput.value.trim() : "";
    const qtd = qtdInput ? qtdInput.value.trim() : "";
    const nf = nfInput ? nfInput.value.trim() : "";

    if (!forn || !origem || !dataRec || !qtd || !nf) {
        alert("⚠️ Segurança: Preencha todos os dados da carga antes de salvar.");
        return;
    }

    const btnSalvar = document.getElementById('btnSalvar');
    if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.innerText = "⏳ Gravando na Nuvem...";
    }

    if (!db) {
        alert("✅ Modo de contingência: Dados validados!");
        if (btnSalvar) {
            btnSalvar.innerText = "✓ Análise Registrada!";
            btnSalvar.style.backgroundColor = "#7f8c8d";
        }
        return;
    }

    try {
        await db.collection("analises_lotes").add({
            fornecedor: forn,
            origem: origem,
            dataRecebimento: dataRec,
            quantidadeKg: Number(qtd),
            nf: nf,
            ...ultimoResultadoCalculado,
            dataRegistro: new Date().toLocaleString('pt-BR'),
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("✅ Análise salva com sucesso na nuvem do Google Firestore!");

        if (btnSalvar) {
            btnSalvar.innerText = "✓ Análise Salva na Nuvem!";
            btnSalvar.style.backgroundColor = "#7f8c8d";
        }
    } catch (erro) {
        console.error("Erro ao salvar no Firestore:", erro);
        alert("❌ Erro ao salvar na nuvem: " + erro.message);
        if (btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.innerText = "💾 Salvar Análise na Nuvem";
        }
    }
};

// 7. INICIALIZAÇÃO SEGURA DO DOCUMENTO
document.addEventListener('DOMContentLoaded', function () {
    carregarDropdownFornecedores();

    const btnCalcular = document.getElementById('btnCalcular');
    if (btnCalcular) {
        btnCalcular.onclick = function (e) {
            e.preventDefault();
            window.processarAmostraUnica();
        };
    }

    window.addEventListener('click', function (e) {
        const modal = document.getElementById('janelaModalInfo');
        if (e.target === modal) {
            window.fecharJanelaInfo();
        }
    });
});
