export const features = [
  { id: 'acquisition.view', title: 'Przeglądaj kandydatów i źródła', module: 'acquisition' },
  { id: 'acquisition.manage', title: 'Zarządzaj kampaniami i kandydatami', module: 'acquisition', dependsOn: ['acquisition.view'] },
  { id: 'acquisition.run', title: 'Uruchamiaj przygotowanie pakietu', module: 'acquisition', dependsOn: ['acquisition.view'] },
  { id: 'acquisition.review', title: 'Zatwierdzaj rewizje pakietu', module: 'acquisition', dependsOn: ['acquisition.view'] },
  { id: 'acquisition.export', title: 'Eksportuj zatwierdzony pakiet', module: 'acquisition', dependsOn: ['acquisition.view'] },
]
export default features
