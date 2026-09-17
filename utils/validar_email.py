Aquí tienes una función sencilla, reutilizable y con pruebas unitarias que valida direcciones de correo electrónico usando una expresión regular basada en la especificación **RFC 5322** (versión simplificada).  

```python
import re
from typing import Final

# Expresión regular “práctica” para validar correos electrónicos.
# No cubre el RFC completo (muy complejo), pero es suficiente para la
# gran mayoría de casos reales y evita falsos negativos/positivos comunes.
_EMAIL_REGEX: Final[re.Pattern] = re.compile(
    r"^(?P<local>[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+"
    r"(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*)"
    r")@"
    r"(?P<domain>(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})$"
)

def es_email_valido(email: str) -> bool:
    """
    Comprueba si una cadena tiene la forma de una dirección de correo electrónico.

    Parámetros
    ----------
    email: str
        Cadena a validar.

    Retorna
    -------
    bool
        ``True`` si el formato es válido, ``False`` en caso contrario.

    Notas
    -----
    - La validación se limita al *formato* del email; no verifica la existencia
      del dominio ni si la bandeja está activa.
    - Se ignora la longitud total (máximo 254 caracteres según RFC) por simplicidad,
      pero puedes añadirla fácilmente: ``if len(email) > 254: return False``.
    """
    if not isinstance(email, str):
        # Un tipo inesperado nunca será válido.
        return False

    # Eliminamos espacios en blanco al inicio/final (los usuarios a menudo los añaden por error).
    email = email.strip()

    # La expresión regular devuelve ``None`` si no coincide.
    return _email_regex.fullmatch(email) is not None


# ----------------------------------------------------------------------
# Pruebas rápidas (puedes moverlas a un archivo de pruebas separado)
# ----------------------------------------------------------------------
if __name__ == "__main__":
    casos_validos = [
        "usuario@example.com",
        "nombre.apellido@sub.dominio.org",
        "user+tag@domain.co.uk",
        "a_b-c.d@e-f.g",
        "12345@numbers.net",
    ]

    casos_invalidos = [
        "sin-arroba.com",
        "dos@@dominio.com",
        "espacios @dominio.com",
        "usuario@dominio",               # falta TLD
        "usuario@-invalido.com",        # dominio no puede iniciar con guión
        "usuario@dominio..com",         # doble punto
        "",                              # cadena vacía
        None,                            # tipo no str
    ]

    for e in casos_validos:
        assert es_email_valido(e), f"Debería ser válido: {e}"
    for e in casos_invalidos:
        assert not es_email_valido(e), f"Debería ser inválido: {e}"

    print("Todas las pruebas rápidas pasaron ✔")
```

### Por qué he tomado estas decisiones
| Tema | Decisión | Justificación |
|------|----------|----------------|
| **Expresión regular** | Utilizo una regex simplificada que cubre la mayoría de los casos reales. | La especificación completa del RFC 5322 es extremadamente larga y difícil de mantener; una versión práctica evita falsos negativos comunes sin ser excesivamente restrictiva. |
| **Tipado** | `email: str` y retorno `bool`. | Facilita la integración con herramientas de análisis estático (mypy, pyright). |
| **Docstring** | Detallada, con sección *Notas*. | Mejora la autogeneración de documentación y la comprensión del comportamiento. |
| **Validación de tipo** | `isinstance(email, str)`. | Previene errores si la función recibe, por ejemplo, `None`. |
| **Strip** | `email.strip()` antes de validar. | Los usuarios a menudo copian/pegan con espacios al inicio o al final. |
| **Pruebas integradas** | Bloque `if __name__ == "__main__"` con asserts. | Permite ejecutar rápidamente una sanity‑check sin depender de un framework externo. |
| **Extensibilidad** | Comentario para añadir límite de longitud. | Si necesitas cumplir estrictamente con la longitud máxima (254), solo una línea más. |

---

#### Alternativas
- **`email-validator` (pypi)**: biblioteca robusta que verifica tanto formato como existencia del dominio mediante DNS. Ideal para aplicaciones en producción donde la precisión es crítica.
- **`re.fullmatch` vs `re.search`**: uso `fullmatch` garantiza que toda la cadena sea un email, sin partes sobrantes.

Con esta función tendrás una solución ligera, fácil de leer y suficientemente fiable para la mayoría de los casos de uso. ¡Éxitos!