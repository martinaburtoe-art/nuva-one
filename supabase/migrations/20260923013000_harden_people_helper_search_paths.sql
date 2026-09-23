-- Harden Chilean People helper functions against mutable search_path resolution.
CREATE OR REPLACE FUNCTION public.people_add_holiday_days(p_start date, p_habiles numeric)
RETURNS date LANGUAGE plpgsql STABLE SET search_path=public,pg_temp AS $$
DECLARE d date:=p_start; n integer:=0;
BEGIN
  WHILE n < ceil(p_habiles) LOOP
    d:=d+1;
    IF extract(isodow FROM d) BETWEEN 1 AND 5
       AND NOT EXISTS (SELECT 1 FROM public.people_chile_holidays h WHERE h.holiday_date=d AND NOT h.is_working_holiday)
    THEN n:=n+1; END IF;
  END LOOP;
  RETURN d;
END $$;

CREATE OR REPLACE FUNCTION public.people_valid_rut(p_rut text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE r text; body text; dv text; s integer:=0; f integer:=2; digit integer; calc text;
BEGIN
  r:=upper(regexp_replace(coalesce(p_rut,''),'[^0-9Kk]','','g'));
  IF length(r)<2 THEN RETURN false; END IF;
  body:=left(r,length(r)-1); dv:=right(r,1);
  IF body !~ '^[0-9]+$' THEN RETURN false; END IF;
  FOR digit IN REVERSE length(body)..1 LOOP
    s:=s+(substr(body,digit,1)::integer*f); f:=f+1; IF f>7 THEN f:=2; END IF;
  END LOOP;
  calc:=CASE WHEN 11-(s%11)=11 THEN '0' WHEN 11-(s%11)=10 THEN 'K' ELSE (11-(s%11))::text END;
  RETURN calc=dv;
END $$;
