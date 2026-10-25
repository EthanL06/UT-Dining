import { createMMKV } from 'react-native-mmkv';

export const miscStorage = createMMKV({ id: 'misc', mode: 'multi-process' });
