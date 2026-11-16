import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { matchesSearch } from '@/domain';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { SubjectCard } from '@/features/student/subject-card';
import { useCatalog } from '@/state/catalog';

export function SubjectsScreen() {
  const [query, setQuery] = useState('');
  const catalog = useCatalog();
  const subjects = catalog.subjects;
  const visible = useMemo(
    () => subjects.filter((item) => matchesSearch(query, item.name, item.professor, item.room)),
    [query, subjects],
  );

  return (
    <CatalogGate title="Minhas disciplinas">
    <Screen
      tone="brand"
      title="Minhas disciplinas"
      subtitle={catalog.mode === 'demo' ? 'Dados locais de demonstração' : 'Matrículas da sua conta'}
      safeBottom={false}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Buscar disciplina ou professor" />
      {visible.length === 0 ? (
        <EmptyState title="Nenhuma disciplina encontrada" description="Ajuste a busca para ver a lista novamente." />
      ) : (
        visible.map((subject) => <SubjectCard key={subject.id} item={subject} />)
      )}
    </Screen>
    </CatalogGate>
  );
}
