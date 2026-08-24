import type { HelpPack } from "./types";

/** Português europeu. Mesmas secções, mesma ordem e mesmas afirmações que `en.ts`. */
export const pt: HelpPack = {
  worker: {
    title: "A tua semana, e as tuas horas",
    audience: "Para quem anda no terreno.",
    sections: [
      {
        heading: "Picar o ponto",
        body: [
          "Abre o ponto, escolhe o estaleiro se não vier já preenchido pela tua agenda, e carrega em começar. Carrega em parar quando acabares. É só isto, e foi feito para se fazer com uma mão.",
          "Guarda a página do ponto no ecrã inicial do telemóvel e ela abre logo no botão, sem o browser à volta.",
          "O telemóvel pode pedir para partilhar a posição. É usada uma vez, no momento, para responder a uma pergunta — esta picagem foi no estaleiro? — e depois é deitada fora. O STRATON não guarda onde estás, e não há coluna na base de dados que pudesse.",
        ],
      },
      {
        heading: "A tua agenda",
        body: [
          "A semana mostra os trabalhos em que estás, com as horas e a morada. Se um trabalho mudar ou for cancelado recebes uma notificação — é esse o canal que te chega a tempo.",
          "Também podes pôr a tua semana no calendário do telemóvel: a agenda tem um endereço de subscrição para isso. Atualiza sozinho, mas não ao minuto — é a aplicação de calendário que decide quando vai buscar, às vezes só horas depois. Uma mudança de última hora confirma-se na aplicação, nunca no calendário.",
          "Esse endereço é uma chave. Quem o tiver lê a tua agenda sem entrar na conta, por isso envia-o só a ti próprio, e revoga-o se se perder. O ecrã mostra quando foi lido pela última vez, e é assim que darias por isso.",
        ],
      },
      {
        heading: "Dizer quando não estás disponível",
        body: [
          "Declara férias, formação ou uma ausência na Disponibilidade, e o teu encarregado vê as datas quando estiver a planear.",
          "Duas coisas que vale a pena saber. Avisa, não bloqueia: o encarregado pode marcar-te à mesma, e é avisado de que há conflito — às vezes as férias caem, às vezes ofereceste-te, e não é o sistema que decide isso. E a nota que escreves não é mostrada aos colegas; eles veem as datas, não o motivo.",
        ],
      },
      {
        heading: "Trocar um turno",
        body: [
          "Em qualquer trabalho em que estejas, podes pedir a um colega que fique com ele. O colega tem de aceitar antes de mais alguém entrar na conversa, e só depois é que um encarregado pode aprovar. Até o encarregado aprovar, o trabalho continua a ser teu.",
          "O colega vai primeiro de propósito: sem isso, qualquer um podia entregar o seu sábado a alguém que nunca concordou em ficar com ele.",
        ],
      },
      {
        heading: "A tua folha de horas",
        body: [
          "As horas que picas tornam-se uma folha semanal. Tu submetes; o teu encarregado ou o escritório aprova. Depois de aprovada é o registo que segue para a folha de pagamento, por isso confere a semana antes de a enviares.",
        ],
      },
    ],
  },

  supervisor: {
    title: "Planear a semana",
    audience: "Para chefes de equipa e encarregados de obra.",
    sections: [
      {
        heading: "Marcar trabalho",
        body: [
          "Cria um trabalho na agenda: um título, as horas, o estaleiro, e quem está nele. Toda a gente marcada é notificada.",
          "Podes marcar pessoa a pessoa ou marcar uma equipa inteira.",
        ],
      },
      {
        heading: "Marcar uma equipa congela quem estava nela",
        body: [
          "Esta é a regra que surpreende as pessoas, e é deliberada. Marcar uma equipa grava as pessoas que estão nela naquele momento. Quem sair da equipa amanhã continua no trabalho para que foi marcado ontem.",
          "Calcular a composição ao vivo faria com que a equipa de um trabalho já feito mudasse retroativamente — e a folha de horas deixava de concordar com quem esteve mesmo no estaleiro. Para os registos exigidos na Bélgica isso não serve: tem de haver registo de quem foi atribuído no dia.",
        ],
      },
      {
        heading: "A disponibilidade avisa, não bloqueia",
        body: [
          "Marcar alguém que se declarou ausente é permitido, e és avisado. Um encarregado que saiba algo que o sistema não sabe nunca deve ser impedido por ele; o que não pode acontecer é marcar às cegas.",
          "Vês as datas e o tipo. Não vês a nota que a pessoa escreveu sobre o motivo.",
        ],
      },
      {
        heading: "Mudar um trabalho de sítio ou de hora",
        body: [
          "Usa Reagendar no próprio trabalho. Só o que mudou de facto é anunciado: guardar sem tocar em nada não avisa ninguém, e uma mudança de hora e uma mudança de estaleiro são notificações diferentes porque são problemas diferentes para quem as recebe.",
          "A disponibilidade é reverificada nas datas novas. Quem estava livre às 7h30 pode não estar às 9h00.",
        ],
      },
      {
        heading: "Trocas de turno",
        body: [
          "Um trabalhador pede a um colega; o colega aceita; e só então chega a ti. O Aprovar só aparece depois de o colega aceitar — aprovar uma passagem que um dos lados desconhece é como alguém descobre no próprio dia.",
          "Podes recusar em qualquer momento. Aprovar é o momento em que o trabalho muda mesmo de mãos, e as duas pessoas são avisadas.",
        ],
      },
      {
        heading: "Relatórios de campo",
        body: [
          "Os relatórios são preenchidos a partir de um modelo que a tua empresa escreveu. Passam de rascunho a submetido, e ou os aprovas ou pedes alterações. O histórico de quem fez o quê fica no relatório.",
        ],
      },
    ],
  },

  manager: {
    title: "Gerir a empresa",
    audience: "Para donos, administradores e escritório.",
    sections: [
      {
        heading: "Configurar",
        body: [
          "As Definições guardam o registo da própria empresa — idioma, fuso horário, pausa por omissão — e o mapa de permissões que decide o que cada papel pode fazer.",
          "Adicione as suas pessoas em Pessoal. É enviado um convite por e-mail; a pessoa define a sua própria palavra-passe. Quem já tem conta STRATON através de outra empresa não recebe e-mail, e isso não é um erro: recebe o link, que pode enviar da forma como costuma falar com ela.",
        ],
      },
      {
        heading: "Clientes: uma empresa ou uma pessoa",
        body: [
          "Um cliente pode ser uma empresa registada ou um particular, e a escolha vem primeiro porque muda o que é pedido. Uma empresa procura-se pelo nome no registo belga, e daí vêm o número de IVA e a sede. Uma pessoa não tem nada disso, e não lhe é pedido.",
          "Isto conta para além do formulário: a faturação tem de saber qual dos dois é, porque o tratamento do IVA não é o mesmo.",
        ],
      },
      {
        heading: "Convidar outra empresa",
        body: [
          "Um subcontratado sem conta STRATON pode ser convidado por e-mail. O link desse convite permite a quem o tiver criar uma empresa ligada à sua, por isso é uma credencial: envie-o à empresa, não a um grupo de conversa.",
          "Expira, funciona uma vez, e pode ser revogado.",
        ],
      },
      {
        heading: "Delegar não é colaborar",
        body: [
          "São duas coisas diferentes e a diferença é quem consentiu. Delegar um trabalho a outra empresa mostra ao contratante o estado do trabalho — não as pessoas que o fazem. Convidar uma empresa para um estaleiro mostra o estado e a equipa, porque essa empresa aceitou o convite.",
          "Uma cadeia pode ter cinco níveis e não pode fechar-se sobre si própria. Cada empresa vê um nível: quem lhe deu o trabalho, e a quem o deu. Não a cadeia inteira.",
        ],
      },
      {
        heading: "Do ponto ao recibo de vencimento",
        body: [
          "As horas tornam-se folhas semanais, as folhas são aprovadas, e as horas aprovadas alimentam o período de folha de pagamento. O relatório de horas trabalhadas exporta em CSV, porque um contabilista precisa de um ficheiro e não de um ecrã.",
          "O painel assinala o que precisa de atenção: horas que divergem do planeado, pessoas sem registo hoje, folhas à espera de aprovação.",
        ],
      },
      {
        heading: "O que o STRATON não faz",
        body: [
          "Regista o que as pessoas introduzem. Não verifica se um registo de tempo de trabalho é verdadeiro, e não substitui as suas próprias obrigações de declarar e de conservar — a Dimona e o registo eletrónico de presença em obras grandes não fazem parte do produto.",
          "A verificação da obrigação de retenção (artigo 30.º-bis) liga ao portal oficial. Diz-lhe onde procurar; não responde por si.",
        ],
      },
    ],
  },

  partner: {
    title: "Trabalhar no estaleiro de outra empresa",
    audience: "Para uma empresa convidada para um estaleiro.",
    sections: [
      {
        heading: "Aceitar o convite",
        body: [
          "O link que recebeu cria a sua empresa no STRATON, ou liga a que já tem. Aceitar é o consentimento — não há segunda confirmação, e é o que torna o estaleiro visível para si.",
        ],
      },
      {
        heading: "O que vê, e o que não vê",
        body: [
          "Vê o estaleiro para o qual foi convidado, e as suas próprias pessoas nele. Não vê as equipas das outras empresas, os outros estaleiros do cliente, a carteira de clientes dele, nem nada sobre o pessoal dele.",
          "A fronteira é imposta pela base de dados, linha a linha, e não pelos ecrãs — é por isso que se mantém mesmo onde uma interface se pudesse esquecer dela.",
        ],
      },
      {
        heading: "Pôr as suas pessoas lá",
        body: [
          "Depois de aceitar, aloque os seus próprios trabalhadores ao estaleiro. Eles picam o ponto contra ele como em qualquer outro trabalho, e as horas são suas: aparecem nas suas folhas, não nas do contratante.",
        ],
      },
      {
        heading: "O que o contratante vê de si",
        body: [
          "Se o trabalho lhe foi delegado, ele vê o estado — planeado, em curso, feito — e não quem enviou. Se o convidou para o estaleiro, vê também a sua equipa lá, porque foi isso que aceitou.",
          "Se essa distinção lhe importa, vale a pena perguntar qual das duas lhe foi dada antes de aceitar.",
        ],
      },
    ],
  },
};
