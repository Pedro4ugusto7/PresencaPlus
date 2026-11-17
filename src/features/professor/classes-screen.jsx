import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { matchesSearch } from '@/domain';
import { ClassCard } from '@/features/professor/class-card';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { useCatalog } from '@/state/catalog';
export function ClassesScreen() {
  const [query, setQuery] = useState('');
  const catalog = useCatalog();
  const classes = catalog.classes;
  const reload = catalog.reload;
  const live = catalog.mode === 'live';
  useFocusEffect(useCallback(() => {
    if (!live) return undefined;
    reload(true);
  }, [live, reload]));
  const visible = useMemo(() => classes.filter(item => matchesSearch(query, item.discipline, item.groupName ?? '', item.program, item.room, item.period)), [classes, query]);
  return <CatalogGate title="Minhas turmas">
    <Screen tone="brand" title="Minhas turmas" subtitle={catalog.mode === 'demo' ? 'Dados locais de demonstração' : 'Turmas vinculadas à sua conta'} safeBottom={false}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Buscar turma ou sala" />
      {visible.length === 0 ? <EmptyState title="Nenhuma turma encontrada" description="Ajuste a busca. A lista completa continua disponível ao limpar o campo." /> : visible.map(item => <ClassCard key={item.id} item={item} />)}
    </Screen>
    </CatalogGate>;
}
