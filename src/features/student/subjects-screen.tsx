import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { previewSource } from '@/data';
import { matchesSearch } from '@/domain';
import { SubjectCard } from '@/features/student/subject-card';

export function SubjectsScreen() {
  const [query, setQuery] = useState('');
  const subjects = previewSource.listSubjects();
  const visible = useMemo(
    () => subjects.filter((item) => matchesSearch(query, item.name, item.professor, item.room)),
    [query, subjects],
  );

  return (
    <Screen tone="brand" title="Minhas disciplinas" subtitle="Dados locais de demonstração" safeBottom={false}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Buscar disciplina ou professor" />
      {visible.length === 0 ? (
        <EmptyState title="Nenhuma disciplina encontrada" description="Ajuste a busca para ver a lista novamente." />
      ) : (
        visible.map((subject) => <SubjectCard key={subject.id} item={subject} />)
      )}
    </Screen>
  );
}
