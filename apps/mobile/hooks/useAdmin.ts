import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkAdminAccess, signInAsAdmin, signOutAdmin } from '~/services/admin/session';
import {
  type AdminPlace,
  fetchAdminHealth,
  fetchAdminPlace,
  fetchAdminPlaces,
  type PlaceChanges,
  refreshHall,
  saveAdminPlace,
} from '~/services/admin/tools';

const ACCESS_KEY = ['admin', 'access'];
const HEALTH_KEY = ['admin', 'health'];
const PLACES_KEY = ['admin', 'places'];

export const useAdminAccess = () =>
  useQuery({ queryKey: ACCESS_KEY, queryFn: checkAdminAccess, staleTime: 60_000, retry: false });

export const useAdminSignIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signInAsAdmin,
    onSuccess: (access) => queryClient.setQueryData(ACCESS_KEY, access),
  });
};

export const useAdminSignOut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOutAdmin,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['admin'] });
      queryClient.setQueryData(ACCESS_KEY, { status: 'none' });
    },
  });
};

export const useAdminHealth = () =>
  useQuery({
    queryKey: HEALTH_KEY,
    queryFn: fetchAdminHealth,
    retry: false,
    refetchInterval: (query) => {
      const scraper = query.state.data?.scraper;
      return scraper?.status === 'ready' && scraper.active ? 10_000 : false;
    },
  });

export const useRefreshHall = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshHall,
    onSettled: () => queryClient.invalidateQueries({ queryKey: HEALTH_KEY }),
  });
};

export const useAdminPlaces = () =>
  useQuery({ queryKey: PLACES_KEY, queryFn: fetchAdminPlaces, retry: false });

export const useAdminPlace = (id: string) =>
  useQuery({
    queryKey: [...PLACES_KEY, id],
    queryFn: () => fetchAdminPlace(id),
    retry: false,
  });

export const useSaveAdminPlace = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: PlaceChanges) => saveAdminPlace(id, changes),
    onSuccess: (place: AdminPlace) => {
      queryClient.setQueryData([...PLACES_KEY, id], place);
      return queryClient.invalidateQueries({ queryKey: PLACES_KEY, exact: true });
    },
  });
};
