-- ============================================================
-- Scholarship agreements -- data minimization on archive (part 1/2)
--
-- Once both parties have signed (status = 'archived') and the
-- completion email has been sent, the only thing we still need to
-- keep is the signed PDF itself and the immutable timestamps. All
-- the contact details, identity data, and Dokobit tokens get nulled
-- out. The signed PDF embeds the same information already; keeping
-- the row's structured fields is duplicate processing for no
-- purpose.
--
-- Part 1 only adds the new enum value -- enum value adds must be
-- isolated in their own transaction so subsequent statements can
-- reference the new value. Part 2 (the RPC + trigger) follows.
-- ============================================================

alter type scholarship_event_type add value if not exists 'data_minimized';
