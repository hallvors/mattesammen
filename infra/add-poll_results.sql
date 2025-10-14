CREATE TABLE poll_results (
  -- a specific student session, room type poll we presume
  student_session integer NOT NULL,
  -- asked a question with the following text
  q_text text NOT NULL,
  -- and the person submitting this answer chose...
  answer text NOT NULL,

  CONSTRAINT student_session_fkey FOREIGN KEY (student_session)
    REFERENCES student_sessions (id) MATCH SIMPLE
    ON UPDATE NO ACTION ON DELETE NO ACTION

);
