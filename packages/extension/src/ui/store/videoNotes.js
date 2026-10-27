import { action, thunk } from 'easy-peasy';

export const defaultNote = {
  id: '',
  content: '',
  timestamp: null,
  image: ''
};

const videoNotesModel = {
  editor: {
    active: false,
    revision: 0,
    note: { ...defaultNote },
    setActive: action((state, active) => {
      state.active = active;
    }),
    setNote: action((state, note) => {
      state.note = { ...state.note, ...note };
    }),
    reset: action(state => {
      state.active = false;
      state.revision += 1;
      state.note = { ...defaultNote };
    })
  },
  support: {
    open: false,
    setOpen: action((state, payload) => {
      state.open = payload;
    })
  },
  edit: action((state, note) => {
    state.editor.active = true;
    state.editor.revision += 1;
    state.editor.note = { ...defaultNote, ...note };
  }),
  reset: thunk(async actions => {
    actions.editor.reset();
  })
};

export default videoNotesModel;
