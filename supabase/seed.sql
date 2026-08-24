-- ============================================================================
-- Buildhaus · seed.sql
-- ----------------------------------------------------------------------------
-- Idempotent-ish base data. Run AFTER migrations. Auth users + their profile
-- links are created by scripts/seed-users.mjs (needs the service-role key);
-- this file sets up everything that doesn't depend on auth.users.
-- ============================================================================

-- Fixed org id so the Node seed script can reference it deterministically.
insert into organisations (id, name, legal_name, city, state, phone, email)
values ('00000000-0000-0000-0000-0000000000b1', 'Buildhaus', 'Buildhaus Constructions',
        'Nellore', 'Andhra Pradesh', '+91 90000 00000', 'hello@buildhaus.example')
on conflict (id) do nothing;

insert into organisation_settings (organisation_id)
values ('00000000-0000-0000-0000-0000000000b1')
on conflict (organisation_id) do nothing;

-- ---------------------------------------------------------------------------
-- Permission catalogue  (module.action)
-- ---------------------------------------------------------------------------
insert into permissions (key, module, action, description) values
  ('crm.read','crm','read','View leads & CRM'),
  ('crm.write','crm','write','Manage leads & CRM'),
  ('estimator.read','estimator','read','View estimator config'),
  ('estimator.write','estimator','write','Configure estimator rates'),
  ('quotations.read','quotations','read','View quotations'),
  ('quotations.write','quotations','write','Create/edit quotations'),
  ('projects.read','projects','read','View projects'),
  ('projects.write','projects','write','Create/edit projects'),
  ('tasks.read','tasks','read','View tasks'),
  ('tasks.write','tasks','write','Update tasks'),
  ('reports.read','reports','read','View daily reports'),
  ('reports.write','reports','write','Submit daily reports'),
  ('reports.approve','reports','approve','Approve daily reports'),
  ('drawings.read','drawings','read','View drawings'),
  ('drawings.write','drawings','write','Upload drawings/revisions'),
  ('drawings.approve','drawings','approve','Approve drawings for construction'),
  ('materials.read','materials','read','View materials'),
  ('materials.request','materials','request','Raise material requests'),
  ('procurement.read','procurement','read','View procurement'),
  ('procurement.write','procurement','write','Manage procurement'),
  ('suppliers.read','suppliers','read','View suppliers'),
  ('suppliers.write','suppliers','write','Manage suppliers'),
  ('labour.read','labour','read','View labour'),
  ('labour.attendance','labour','attendance','Enter attendance'),
  ('labour.write','labour','write','Manage labour & bills'),
  ('finance.read','finance','read','View finance & profitability'),
  ('finance.write','finance','write','Manage finance'),
  ('quality.read','quality','read','View quality'),
  ('quality.write','quality','write','Manage quality inspections'),
  ('clients.read','clients','read','View clients'),
  ('clients.write','clients','write','Manage clients'),
  ('reports_module.read','reports_module','read','View reports & analytics'),
  ('settings.read','settings','read','View settings'),
  ('settings.write','settings','write','Manage settings'),
  ('users.manage','users','manage','Manage users & roles'),
  ('ai.use','ai','use','Use AI assistant')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- The four MVP roles (system roles). Reference by key everywhere else.
-- ---------------------------------------------------------------------------
insert into roles (organisation_id, key, label, is_system, scope) values
  ('00000000-0000-0000-0000-0000000000b1','owner','Owner / Super Admin', true,'all'),
  ('00000000-0000-0000-0000-0000000000b1','site_engineer','Site Engineer', true,'assigned'),
  ('00000000-0000-0000-0000-0000000000b1','architect','Architect', true,'assigned'),
  ('00000000-0000-0000-0000-0000000000b1','client','Client', true,'own')
on conflict (organisation_id, key) do nothing;

-- Helper to fetch a role id by key within the seed org.
-- Owner gets every permission.
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.key='owner' and r.organisation_id='00000000-0000-0000-0000-0000000000b1'
on conflict do nothing;

-- Site Engineer grants.
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p on p.key in
  ('projects.read','tasks.read','tasks.write','reports.read','reports.write',
   'drawings.read','materials.read','materials.request','labour.attendance',
   'quality.read','quality.write')
where r.key='site_engineer' and r.organisation_id='00000000-0000-0000-0000-0000000000b1'
on conflict do nothing;

-- Architect grants.
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p on p.key in
  ('projects.read','drawings.read','drawings.write','tasks.read')
where r.key='architect' and r.organisation_id='00000000-0000-0000-0000-0000000000b1'
on conflict do nothing;

-- Client grants (deliberately tiny; RLS does the heavy lifting).
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p on p.key in
  ('projects.read','drawings.read')
where r.key='client' and r.organisation_id='00000000-0000-0000-0000-0000000000b1'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Estimator packages + a starter rate card (Nellore). All Owner-editable.
-- ---------------------------------------------------------------------------
insert into estimator_packages (organisation_id, name, building_type, base_rate_sqft, inclusions, exclusions) values
  ('00000000-0000-0000-0000-0000000000b1','Essential','independent_house',1850,
     '["Standard vitrified flooring","Emulsion paint","CPVC plumbing","Modular switches (economy)","Standard doors/windows"]',
     '["Compound wall","Interiors","Lift","Borewell","Statutory approvals"]'),
  ('00000000-0000-0000-0000-0000000000b1','Premium','independent_house',2400,
     '["Premium vitrified/wooden flooring","Texture + emulsion","Branded CP fittings","Designer elevation","UPVC windows"]',
     '["Interiors (modular)","Lift","Landscaping","Statutory approvals"]'),
  ('00000000-0000-0000-0000-0000000000b1','Luxury','villa',3200,
     '["Imported marble/wooden flooring","Home automation ready","Premium sanitaryware","False ceiling","Elevation lighting"]',
     '["Furniture","Swimming pool","Statutory approvals"]')
on conflict do nothing;

insert into estimator_rates (organisation_id, key, label, city, state, value, unit) values
  ('00000000-0000-0000-0000-0000000000b1','material_pct','Material share','Nellore','Andhra Pradesh',58,'%'),
  ('00000000-0000-0000-0000-0000000000b1','labour_pct','Labour share','Nellore','Andhra Pradesh',25,'%'),
  ('00000000-0000-0000-0000-0000000000b1','design_pct','Design & professional','Nellore','Andhra Pradesh',6,'%'),
  ('00000000-0000-0000-0000-0000000000b1','contingency_pct','Contingency','Nellore','Andhra Pradesh',3,'%'),
  ('00000000-0000-0000-0000-0000000000b1','gst_pct','GST','Nellore','Andhra Pradesh',18,'%'),
  ('00000000-0000-0000-0000-0000000000b1','cement_rate','OPC 53 cement',null,null,380,'₹/bag'),
  ('00000000-0000-0000-0000-0000000000b1','steel_rate','Fe550D TMT steel',null,null,68000,'₹/MT'),
  ('00000000-0000-0000-0000-0000000000b1','lift_cost','Passenger lift (per stop)',null,null,180000,'₹'),
  ('00000000-0000-0000-0000-0000000000b1','compound_wall_cost','Compound wall',null,null,1200,'₹/rft'),
  ('00000000-0000-0000-0000-0000000000b1','sump_cost','Underground sump',null,null,55000,'₹'),
  ('00000000-0000-0000-0000-0000000000b1','septic_cost','Septic tank',null,null,45000,'₹'),
  ('00000000-0000-0000-0000-0000000000b1','floor_adj','Per additional floor uplift',null,null,3,'%')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Quality checklist templates (a representative subset; Owner adds the rest).
-- ---------------------------------------------------------------------------
insert into quality_checklists (organisation_id, name, items) values
  ('00000000-0000-0000-0000-0000000000b1','Column Steel',
     '[{"label":"Bar diameter as per drawing","required":true},{"label":"Number of bars correct","required":true},{"label":"Stirrup spacing correct","required":true},{"label":"Cover blocks placed","required":true},{"label":"Lap length adequate","required":true}]'),
  ('00000000-0000-0000-0000-0000000000b1','Slab Steel',
     '[{"label":"Main bar spacing","required":true},{"label":"Distribution bars","required":true},{"label":"Chairs/spacers placed","required":true},{"label":"Electrical conduits laid","required":false},{"label":"Cover maintained","required":true}]'),
  ('00000000-0000-0000-0000-0000000000b1','Concrete Pour',
     '[{"label":"Mix grade verified","required":true},{"label":"Slump test done","required":true},{"label":"Vibration adequate","required":true},{"label":"Cubes cast for testing","required":true},{"label":"Curing plan in place","required":true}]'),
  ('00000000-0000-0000-0000-0000000000b1','Plastering',
     '[{"label":"Surface prepared/hacked","required":true},{"label":"Thickness uniform","required":true},{"label":"Level & plumb checked","required":true},{"label":"Curing done","required":true}]')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- One public portfolio example so the website isn't empty.
-- ---------------------------------------------------------------------------
insert into public_projects (organisation_id, name, location, city, project_type,
   plot_area_sqft, builtup_area_sqft, floors, completion_year, approx_cost, cost_per_sqft,
   duration_months, package, description, is_public, is_featured) values
  ('00000000-0000-0000-0000-0000000000b1','Reddy Residence','Kotha Kalava','Nellore','duplex',
   2400, 4396, 3, 2025, 10500000, 2388, 11, 'Premium',
   'A G+2 duplex villa with contemporary elevation, UPVC windows and premium finishes.', true, true)
on conflict do nothing;
