CREATE TABLE school_classes (
  id serial PRIMARY KEY,
  school varchar(100) NOT NULL,
  class_name varchar(8) NOT NULL,
  session_type varchar(20)
);

CREATE TABLE student_sessions (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL,
  session_date timestamp NOT NULL,
  completed_tasks integer default 0,
  level integer default 0,
  class_id integer NOT NULL,
  CONSTRAINT class_id_fkey FOREIGN KEY (class_id)
    REFERENCES school_classes (id) MATCH SIMPLE
    ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE OR REPLACE FUNCTION student_sessions_notify() RETURNS trigger AS $$
DECLARE
    row json;
    notification json;
BEGIN
    IF TG_OP = 'DELETE' THEN
      row = row_to_json(OLD);
    ELSE
      row = row_to_json(NEW);
    END IF;

    notification = json_build_object(
      'table', TG_TABLE_NAME,
      'type', TG_OP,
      'row', row
    );
    PERFORM pg_notify('student_sessions_event', notification::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_sessions_trigger
AFTER INSERT OR UPDATE OR DELETE
ON student_sessions FOR EACH ROW
EXECUTE PROCEDURE student_sessions_notify();
