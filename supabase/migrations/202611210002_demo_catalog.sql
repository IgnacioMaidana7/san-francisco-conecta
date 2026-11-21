-- Ubicaciones y tarifas ilustrativas. Contactos tomados del directorio público.
insert into public.stations(id,name,address,lat,lng,bikes,docks) values
('00000000-0000-4000-8000-000000000001','Plaza Cívica','Bv. 9 de Julio y Libertad',-31.4276,-62.0825,8,12),
('00000000-0000-4000-8000-000000000002','Centro Cívico','Bv. 9 de Julio 1187',-31.4253,-62.0861,5,15),
('00000000-0000-4000-8000-000000000003','Plaza Vélez Sarsfield','Av. Vélez Sarsfield',-31.4334,-62.0762,0,20),
('00000000-0000-4000-8000-000000000004','Terminal','Bv. Buenos Aires',-31.4209,-62.0746,11,9);
insert into public.alarms(id,name,zone,lat,lng) values
('00000000-0000-4000-8000-000000000011','Alarma Plaza Cívica','Centro',-31.4282,-62.082),
('00000000-0000-4000-8000-000000000012','Alarma Barrio Norte','Norte',-31.4167,-62.084),
('00000000-0000-4000-8000-000000000013','Alarma Barrio Sur','Sur',-31.438,-62.079);
insert into public.zones(id,name,hourly_rate,hours,lat,lng,radius) values
('00000000-0000-4000-8000-000000000021','Centro',600,'Lun–vie 08:00–20:00 · Sáb 08:00–13:00',-31.4276,-62.0825,300),
('00000000-0000-4000-8000-000000000022','Microcentro',800,'Lun–vie 08:00–20:00 · Sáb 08:00–13:00',-31.423,-62.078,220);
insert into public.contacts(id,name,description,hours,phone,email,whatsapp) values
('00000000-0000-4000-8000-000000000031','Municipalidad · Conmutador','Orientación general. Correo del área de Prensa y asistente Tana por WhatsApp.','Consultar horario en el canal oficial · Tana 24 h','+543564439111','prensa@sanfrancisco.gov.ar','5493564200275'),
('00000000-0000-4000-8000-000000000032','Tasas y contribuciones','Automotores: interno 133 · Inmuebles: interno 138','Consultar horario en el canal oficial','+543564439111',null,null),
('00000000-0000-4000-8000-000000000033','Movilidad urbana','Consultas de movilidad y tránsito','Consultar horario en el canal oficial','+543564439145',null,null),
('00000000-0000-4000-8000-000000000034','Servicios públicos','Limpieza, mantenimiento y espacios públicos','Consultar horario en el canal oficial','+543564439141',null,null);
