-- Reading tasks: where to get each book (sheet sources + gaps filled).
-- Data only. Old `resources` kept in a backup table for rollback.

create table if not exists public.reading_resources_backup_20260930 as
select id, template_code, resources, updated_at
from public.tasks
where template_code in ('MJ-P1-01', 'MJ-P1-03', 'MJ-READ-01', 'MJ-READ-02', 'MJ-READ-03', 'MJ-READ-04', 'MJ-READ-05', 'MJ-READ-06', 'MJ-READ-07');

update public.tasks set resources = '[{"url": "https://www.momtestbook.com/", "type": "article", "title": "The Mom Test - official site", "description": "Buy links (paperback, Kindle, audiobook, PDF) plus free blog posts and talks by the author."}, {"url": "https://www.everand.com/search?query=the+mom+test", "type": "article", "title": "Everand", "description": "Ebook and audiobook subscription; the 30-day free trial covers this short book."}, {"url": "https://www.janisroze.lv/en/catalogsearch/result/?q=mom+test+fitzpatrick", "type": "article", "title": "Jānis Roze - search", "description": "Check the local bookshop for a paperback copy."}]'::jsonb, updated_at = now()
where template_code = 'MJ-P1-01';

update public.tasks set resources = '[{"url": "https://www.janisroze.lv/en/books/field-literature/psychology/cvok-mindset-changing-the-way-you-think-to-fulfil-your-potential.html", "type": "article", "title": "Mindset - Jānis Roze", "description": "Where to get the book locally (UK edition, same text)."}, {"url": "https://archive.org/details/mindsetnewpsycho0000dwec_g9z4", "type": "article", "title": "Internet Archive - free borrow", "description": "Free with an Internet Archive account, 1-hour or 14-day loan."}, {"url": "https://www.overdrive.com/media/74637/mindset", "type": "article", "title": "OverDrive / Libby", "description": "Ebook and audiobook, free with a library card."}, {"url": "https://www.everand.com/book/769258021/Mindset-The-New-Psychology-of-Success", "type": "article", "title": "Everand", "description": "Ebook and audiobook subscription with a 30-day free trial."}, {"url": "https://mindsetonline.com/", "type": "article", "title": "mindsetonline.com", "description": "Carol Dweck''s site: the ideas in short form and where to buy."}]'::jsonb, updated_at = now()
where template_code = 'MJ-P1-03';

update public.tasks set resources = '[{"url": "https://archive.org/details/gritpowerofpassi0000duck", "type": "article", "title": "Internet Archive - free borrow", "description": "Free with an Internet Archive account, 1-hour or 14-day loan."}, {"url": "https://www.everand.com/audiobook/665038417/Grit-The-Power-of-Passion-and-Perseverance", "type": "article", "title": "Everand - audiobook", "description": "Audiobook on a subscription with a 30-day free trial."}, {"url": "https://www.janisroze.lv/en/catalogsearch/result/?q=grit+duckworth", "type": "article", "title": "Jānis Roze - search", "description": "Check the local bookshop for a paperback copy."}]'::jsonb, updated_at = now()
where template_code = 'MJ-READ-01';

update public.tasks set resources = '[{"url": "https://eazybi.com/book", "type": "article", "title": "Mapping the Uncharted (eazyBI)", "description": "The book''s official page."}]'::jsonb, updated_at = now()
where template_code = 'MJ-READ-02';

update public.tasks set resources = '[{"url": "https://www.janisroze.lv/en/books/field-literature/economy-business/f0ju-no-rules-rules-netflix-and-the-culture-of-reinvention.html", "type": "article", "title": "No Rules Rules - Jānis Roze", "description": "Where to get the book locally."}, {"url": "https://www.everand.com/book/786666983/No-Rules-Rules-Netflix-and-the-Culture-of-Reinvention", "type": "article", "title": "Everand", "description": "Ebook and audiobook subscription with a 30-day free trial."}, {"url": "https://www.norulesrules.com/", "type": "article", "title": "norulesrules.com", "description": "Official companion site with the culture-map assessment and extras."}]'::jsonb, updated_at = now()
where template_code = 'MJ-READ-03';

update public.tasks set resources = '[{"url": "https://paulgraham.com/startupideas.html", "type": "article", "title": "Paul Graham - How to Get Startup Ideas", "description": "Essay one."}, {"url": "https://paulgraham.com/ds.html", "type": "article", "title": "Paul Graham - Do Things That Don''t Scale", "description": "Essay two."}, {"url": "https://paulgraham.com/ideas.html", "type": "article", "title": "Paul Graham - Ideas for Startups", "description": "Optional third essay on where ideas come from."}]'::jsonb, updated_at = now()
where template_code = 'MJ-READ-04';

update public.tasks set resources = '[{"url": "https://www.janisroze.lv/en/books/field-literature/economy-business/ejzl-bezos-blueprint-communication-secrets-that-power-amazon-s-success.html", "type": "article", "title": "The Bezos Blueprint - Jānis Roze", "description": "Where to get the book locally."}, {"url": "https://www.overdrive.com/media/8994612/the-bezos-blueprint", "type": "article", "title": "OverDrive / Libby", "description": "Ebook and audiobook, free with a library card."}, {"url": "https://www.carminegallo.com/bezosblueprint/", "type": "article", "title": "carminegallo.com", "description": "Author''s page: excerpts, talks and free articles on the Bezos principles."}]'::jsonb, updated_at = now()
where template_code = 'MJ-READ-05';

update public.tasks set resources = '[{"url": "https://archive.org/details/hardthingaboutha0000horo", "type": "article", "title": "Internet Archive - free borrow", "description": "The full book, free with an Internet Archive account."}, {"url": "https://www.harpercollins.com/products/the-hard-thing-about-hard-things-ben-horowitz", "type": "article", "title": "HarperCollins", "description": "Publisher page with buy links for print, ebook and audio."}, {"url": "https://www.janisroze.lv/en/catalogsearch/result/?q=hard+thing+about+hard+things", "type": "article", "title": "Jānis Roze - search", "description": "Check the local bookshop for a paperback copy."}, {"url": "https://archive.org/details/benhorowitzshard0000horo", "type": "article", "title": "Instaread summary (Archive.org)", "description": "A 30-minute chapter-by-chapter summary, not the book itself."}]'::jsonb, updated_at = now()
where template_code = 'MJ-READ-06';

update public.tasks set resources = '[{"url": "https://www.janisroze.lv/lv/gramatas/akademiska-un-profesionala-literatura/menedzments/zero-to-one-notes-on-start-ups-or-how-to-build-the-future.html", "type": "article", "title": "Zero to One - Jānis Roze", "description": "Where to get the book locally."}, {"url": "https://archive.org/details/zerotoonenoteson0000thie", "type": "article", "title": "Internet Archive - free borrow", "description": "Free with an Internet Archive account, 1-hour or 14-day loan."}, {"url": "https://www.penguinrandomhouse.com/books/234730/zero-to-one-by-peter-thiel-with-blake-masters/", "type": "article", "title": "Penguin Random House", "description": "Publisher page with buy links for print, ebook and audio."}]'::jsonb, updated_at = now()
where template_code = 'MJ-READ-07';

-- Rollback:
-- update public.tasks t set resources = b.resources, updated_at = b.updated_at
--   from public.reading_resources_backup_20260930 b where b.id = t.id;
-- then remove the backup table.
