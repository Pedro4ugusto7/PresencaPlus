import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { previewSource } from '@/data';
import { matchesSearch } from '@/domain';
import { ClassCard } from '@/features/professor/class-card';

export function ClassesScreen() {
  const [query, setQuery] = useState('');
  const classes = previewSource.listClasses();
  const visible = useMemo(
    () => classes.filter((item) => matchesSearch(query, item.discipline, item.program, item.room, item.period)),
    [classes, query],
  );

  return (
    <Screen tone="brand" title="Minhas turmas" subtitle="Dados locais de demonstração" safeBottom={false}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Buscar turma ou sala" />
      {visible.length === 0 ? (
        <EmptyState
          title="Nenhuma turma encontrada"
          description="Ajuste a busca. A lista completa continua disponível ao limpar o campo."
        />
      ) : (
        visible.map((item) => <ClassCard key={item.id} item={item} />)
      )}
    </Screen>
  );
}
