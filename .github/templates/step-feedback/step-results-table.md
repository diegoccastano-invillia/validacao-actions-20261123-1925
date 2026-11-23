### Passo {{ step_number }} — {% if passed %}concluído{% else %}precisa de um ajuste{% endif %}

| Resultado | Verificação |
| --- | --- |
{% for result in results %}| {% if result.passed %}✅ Correto{% else %}❌ Ajustar{% endif %} | {{ result.description }} |
{% endfor %}

{% if not passed %}
Revise os itens marcados e tente novamente. Um erro nesta etapa não libera a próxima.
{% endif %}

{% for tip in tips %}
- {{ tip }}
{% endfor %}

[Abrir a execução da avaliação]({{ run_url }})
