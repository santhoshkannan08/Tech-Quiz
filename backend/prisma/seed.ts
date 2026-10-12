import '../src/config.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const source = [
  ['Which data structure follows LIFO?', ['Queue', 'Stack', 'Tree', 'Graph'], 1],
  ['Which data structure follows FIFO?', ['Stack', 'Tree', 'Queue', 'Graph'], 2],
  ['Which data structure uses nodes and pointers?', ['Linked List', 'Array', 'Integer', 'String'], 0],
  ['What is the first index of an array in C++?', ['1', '-1', '0', '2'], 2],
  ['Which operation adds an element to a stack?', ['Pop', 'Push', 'Delete', 'Search'], 1],
  ['Which operation removes the top element from a stack?', ['Push', 'Insert', 'Pop', 'Enqueue'], 2],
  ['Which operation adds an element to a queue?', ['Dequeue', 'Push', 'Enqueue', 'Pop'], 2],
  ['Which data structure is used in BFS?', ['Queue', 'Stack', 'Array only', 'Tree only'], 0],
  ['Which data structure is commonly used in DFS?', ['Queue only', 'Stack', 'Hash table only', 'Array only'], 1],
  ['A node in a linked list contains data and what else?', ['Pointer or link', 'Compiler', 'Loop', 'Keyword'], 0],
  ['Which data structure represents hierarchical data?', ['Queue', 'Stack', 'Tree', 'Array'], 2],
  ['Which data structure consists of vertices and edges?', ['Stack', 'Graph', 'Queue', 'Array'], 1],
  ['Which of these is a linear data structure?', ['Graph', 'Tree', 'Array', 'None of these'], 2],
  ['Which sorting algorithm repeatedly compares adjacent elements?', ['Merge Sort', 'Bubble Sort', 'Binary Search', 'DFS'], 1],
  ['Which algorithm finds an element in a sorted array by halving the search range?', ['Linear Search', 'Bubble Sort', 'Binary Search', 'BFS'], 2],
  ['What is the time complexity of accessing an array element by index?', ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'], 2],
  ['Which data structure is suitable for undo operations?', ['Queue', 'Stack', 'Graph', 'Tree'], 1],
  ['What is the maximum number of children a binary tree node can have?', ['1', '2', '3', '4'], 1],
  ['Which data structure is commonly used to manage function calls?', ['Stack', 'Queue', 'Graph', 'Heap only'], 0],
  ['What does an empty queue contain?', ['One element', 'Two elements', 'No elements', 'One node always'], 2],
] as const;

for (const [index, [prompt, options, correct]] of source.entries()) {
  const questionId = `pdf-ds-${String(index + 1).padStart(2, '0')}`;
  await prisma.question.upsert({ where: { id: questionId }, update: { prompt }, create: { id: questionId, prompt } });
  for (const [optionIndex, text] of options.entries()) {
    await prisma.option.upsert({ where: { id: `${questionId}-option-${String.fromCharCode(65 + optionIndex)}` }, update: { label: String.fromCharCode(65 + optionIndex), text, isCorrect: optionIndex === correct }, create: { id: `${questionId}-option-${String.fromCharCode(65 + optionIndex)}`, questionId, label: String.fromCharCode(65 + optionIndex), text, isCorrect: optionIndex === correct } });
  }
}
await prisma.quiz.upsert({ where: { slug: 'data-structures' }, update: {}, create: { slug: 'data-structures', title: 'Data Structures Tech Quiz' } });
console.log(`Seeded ${source.length} PDF questions.`);
await prisma.$disconnect();
