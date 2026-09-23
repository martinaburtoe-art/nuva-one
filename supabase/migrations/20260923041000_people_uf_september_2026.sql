-- Nüva People — UF de cierre mensual de septiembre 2026.
-- El motor requiere una vigencia que cubra el período septiembre completo.
update public.people_legal_parameters
set effective_from='2026-09-01',
    effective_to=null,
    value_numeric=41057.20,
    source_url='https://www.sii.cl/valores_y_fechas/uf/uf2026.htm',
    source_reference='SII — UF 30 septiembre 2026',
    notes='UF de cierre de septiembre 2026 usada para topes previsionales del período.'
where country_code='CL'
  and parameter_key='uf_value_clp'
  and effective_from='2026-09-30';