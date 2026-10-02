-- =========================================================================
-- Erst NACH dem Deploy der Version mit "submit_post_response" ausführen.
-- Entfernt die alte Freigabe-Funktion, die Änderungswünsche noch als
-- Kommentare gespeichert hat und keine Sperre während laufender
-- Änderungen kannte.
-- =========================================================================

drop function if exists public.set_post_status(uuid, public.post_status, text, text[]);
