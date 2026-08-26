import pytest


@pytest.mark.django_db
class TestExamCatalog:
    def test_list_requires_authentication(self, api_client):
        response = api_client.get("/api/exams/")
        assert response.status_code == 401

    def test_list_returns_only_active_exams(self, auth_client, exam):
        response = auth_client.get("/api/exams/")
        assert response.status_code == 200
        codes = [e["code"] for e in response.data["results"]]
        assert exam.code in codes

    def test_detail_nests_subjects_with_lightweight_topics_count(self, auth_client, exam, subject, topic):
        """
        Le détail d'un concours renvoie les matières en version allégée
        (topics_count) pour limiter la charge réseau mobile — la liste
        complète des thèmes se récupère via /api/subjects/{id}/ une fois que
        le candidat a choisi une matière (chargement progressif).
        """
        response = auth_client.get(f"/api/exams/{exam.code}/")
        assert response.status_code == 200
        assert response.data["subjects"][0]["name"] == subject.name
        assert response.data["subjects"][0]["topics_count"] == 1

    def test_subject_detail_returns_full_topics_list(self, auth_client, subject, topic):
        response = auth_client.get(f"/api/subjects/{subject.id}/")
        assert response.status_code == 200
        assert response.data["topics"][0]["name"] == topic.name

    def test_subjects_can_be_filtered_by_exam(self, auth_client, exam, subject):
        response = auth_client.get(f"/api/subjects/?exam={exam.id}")
        assert response.status_code == 200
        assert len(response.data["results"]) == 1
