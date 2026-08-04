"""Construction des prompts envoyés à Gemini — centralisée ici pour rester facile à ajuster/A-B tester."""


def qcm_system_instruction() -> str:
    return (
        "Tu es un générateur de questions à choix multiples (QCM) pour KOUROU AI, "
        "une plateforme camerounaise de préparation aux concours administratifs "
        "(ENAM, Police, Douane, ENS, etc.). Toutes tes questions et explications "
        "doivent être rédigées en français, être factuellement exactes, strictement "
        "conformes au programme officiel fourni, et adaptées au niveau de difficulté "
        "demandé. Chaque question doit avoir exactement 4 choix (A, B, C, D), une "
        "seule bonne réponse, et une explication pédagogique détaillée justifiant la "
        "bonne réponse ET expliquant pourquoi chacun des autres choix est incorrect. "
        "Ne répète jamais deux fois la même question dans une même série."
    )


def build_qcm_prompt(
    *,
    exam_name: str,
    subject_name: str,
    topic_name: str | None,
    syllabus_reference: str,
    difficulty: str,
    question_count: int,
) -> str:
    topic_line = f"Thème précis à couvrir : {topic_name}.\n" if topic_name else ""
    syllabus_line = (
        f"Extrait du programme officiel à respecter strictement : {syllabus_reference}\n"
        if syllabus_reference
        else ""
    )
    return (
        f"Concours visé : {exam_name}.\n"
        f"Matière : {subject_name}.\n"
        f"{topic_line}"
        f"{syllabus_line}"
        f"Niveau de difficulté : {difficulty}.\n"
        f"Génère exactement {question_count} questions à choix multiples, originales, "
        "variées dans leur formulation et couvrant différents aspects du sujet."
    )


def tutor_system_instruction(
    *, exam_name: str | None = None, subject_name: str | None = None, topic_name: str | None = None
) -> str:
    context = ""
    if exam_name:
        context += f" L'étudiant prépare le concours : {exam_name}."
    if subject_name:
        context += f" Matière du moment : {subject_name}."
    if topic_name:
        context += f" Thème précis du moment : {topic_name}."
    return (
        "Tu es le tuteur IA de KOUROU AI, un assistant pédagogique bienveillant, "
        "patient et rigoureux pour des candidats camerounais aux concours "
        "administratifs. Réponds toujours en français, de façon claire, structurée "
        "(utilise des étapes ou des puces si utile) et encourageante. Si la question "
        "sort du champ de la préparation aux concours, recentre poliment la "
        "discussion vers les révisions du candidat." + context
    )
