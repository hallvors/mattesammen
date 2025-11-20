-- Polls and quizes deserve a more complex data model..?
-- Kids are a bit spoiled, need some coolness here :p

CREATE TABLE poll (
  poll_id serial PRIMARY KEY,
  poll_title text NOT NULL,
  poll_image bytea,
  class_id integer NOT NULL,
  -- poll belongs to a specific class session
  CONSTRAINT class_id_fkey FOREIGN KEY (class_id)
    REFERENCES school_classes (id) MATCH SIMPLE
    ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE poll_question (
    question_id serial PRIMARY KEY,
    q_order integer NOT NULL,
    poll integer NOT NULL,
    CONSTRAINT poll_fkey FOREIGN KEY (poll)
      REFERENCES poll(poll_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION,
    question text,
    question_image bytea
);

CREATE TABLE poll_answer (
    answer_id serial PRIMARY KEY,
    question integer NOT NULL,
    CONSTRAINT question_fkey FOREIGN KEY (question)
      REFERENCES poll_question(question_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION,

    answer text,
    answer_image bytea,
    is_correct boolean -- if quiz, one or more questions may be the right answer
);

CREATE TABLE poll_results (
  -- a specific student session, room type poll we presume
  student_session integer NOT NULL,
  -- when asked a question with the following id
  question_id integer NOT NULL,
  -- the person submitting this answer chose...
  answer_id integer NOT NULL,

  CONSTRAINT student_session_fkey FOREIGN KEY (student_session)
    REFERENCES student_sessions (id) MATCH SIMPLE
    ON UPDATE NO ACTION ON DELETE NO ACTION,

  CONSTRAINT question_id_fkey FOREIGN KEY (question_id)
    REFERENCES poll_question (question_id) MATCH SIMPLE
    ON UPDATE NO ACTION ON DELETE NO ACTION,

  CONSTRAINT answer_id_fkey FOREIGN KEY (answer_id)
    REFERENCES poll_answer (answer_id) MATCH SIMPLE
    ON UPDATE NO ACTION ON DELETE NO ACTION

);
