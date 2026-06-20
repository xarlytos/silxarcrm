import { getApi } from '../api/client';
import type { Appointment, PaginatedResponse, Pet, PetCoat, PetSex, PetSize } from '../types/api';

export interface ListPetsParams {
  page?: number;
  limit?: number;
  search?: string;
  size?: PetSize;
  breed?: string;
  ownerCustomerId?: string;
  status?: 'active' | 'archived';
}

export interface CreatePetPayload {
  name: string;
  breed?: string;
  size?: PetSize;
  sex?: PetSex;
  birthDate?: string;
  coatType?: PetCoat;
  weightKg?: number;
  color?: string;
  allergies?: string;
  medicalNotes?: string;
  behaviorNotes?: string;
  groomingNotes?: string;
  photoUrl?: string;
  ownerCustomerId: string;
}

export type UpdatePetPayload = Partial<CreatePetPayload> & {
  status?: 'active' | 'archived';
};

export async function listPets(params: ListPetsParams = {}) {
  const { data } = await getApi().get<PaginatedResponse<Pet>>('/pets', { params });
  return data;
}

export async function getPet(id: string) {
  const { data } = await getApi().get<{ pet: Pet }>(`/pets/${id}`);
  return data.pet;
}

export async function createPet(payload: CreatePetPayload) {
  const { data } = await getApi().post<{ pet: Pet }>('/pets', payload);
  return data.pet;
}

export async function updatePet(id: string, payload: UpdatePetPayload) {
  const { data } = await getApi().patch<{ pet: Pet }>(`/pets/${id}`, payload);
  return data.pet;
}

export async function archivePet(id: string) {
  const { data } = await getApi().delete<{ pet: Pet; message: string }>(`/pets/${id}`);
  return data;
}

export async function getPetHistory(id: string): Promise<Appointment[]> {
  const { data } = await getApi().get<{ data: Appointment[] }>(`/pets/${id}/history`);
  return data.data;
}

export async function getPetLastAppointment(id: string): Promise<Appointment | null> {
  const { data } = await getApi().get<{ appointment: Appointment | null }>(
    `/pets/${id}/last-appointment`,
  );
  return data.appointment;
}
