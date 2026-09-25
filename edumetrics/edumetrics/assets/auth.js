/* Sessão simulada — sem BD/autenticação real.
   Guarda apenas { papel, id } no localStorage do navegador. */
const EDU_AUTH = {
  entrar(papel, id) {
    localStorage.setItem("edu_session", JSON.stringify({ papel, id }));
  },
  sair() {
    localStorage.removeItem("edu_session");
    window.location.href = "../index.html";
  },
  sessao() {
    try {
      return JSON.parse(localStorage.getItem("edu_session"));
    } catch {
      return null;
    }
  },
  exigir(papelEsperado) {
    const s = this.sessao();
    if (!s || s.papel !== papelEsperado) {
      window.location.href = "../index.html";
      return null;
    }
    return s;
  }
};
