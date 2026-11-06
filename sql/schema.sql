-- Esquema de la rifa: 300 boletos + función segura para apartar boletos
-- Ejecuta este archivo completo UNA VEZ en el SQL Editor de Supabase.

create table if not exists tickets (
  number        integer primary key,
  status        text not null default 'disponible'
                 check (status in ('disponible', 'apartado', 'vendido')),
  buyer_name    text,
  buyer_phone   text,
  note          text,
  reserved_at   timestamptz,
  paid_at       timestamptz
);

-- Crea los 300 boletos (1 al 300) si todavía no existen.
insert into tickets (number)
select generate_series(1, 300)
on conflict (number) do nothing;

-- Función que aparta uno o varios boletos de forma segura.
-- Usa "SELECT ... FOR UPDATE" para bloquear esas filas mientras decide,
-- así dos personas que aprietan "Apartar" al mismo tiempo NUNCA
-- se quedan con el mismo número: la segunda persona siempre ve el
-- estado ya actualizado por la primera antes de decidir.
create or replace function reserve_tickets(
  p_numbers int[],
  p_name text,
  p_phone text
)
returns table(success boolean, unavailable int[]) as $$
declare
  v_unavailable int[];
begin
  -- Bloquea las filas pedidas para que nadie más las toque mientras verificamos.
  perform 1 from tickets where number = any(p_numbers) for update;

  -- Marca como "no disponible" cualquier número que no exista en la rifa
  -- o que ya no esté en estado 'disponible'.
  select coalesce(array_agg(n), '{}')
    into v_unavailable
    from unnest(p_numbers) as n
   where not exists (
     select 1 from tickets t where t.number = n and t.status = 'disponible'
   );

  if array_length(v_unavailable, 1) > 0 then
    return query select false, v_unavailable;
    return;
  end if;

  -- Todos están disponibles: los apartamos en bloque (todo o nada).
  update tickets
     set status = 'apartado',
         buyer_name = p_name,
         buyer_phone = p_phone,
         reserved_at = now()
   where number = any(p_numbers);

  return query select true, '{}'::int[];
end;
$$ language plpgsql;
