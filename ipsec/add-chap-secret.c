#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
  char *dst = "/etc/ppp/chap-secrets";
  FILE *f;

  if (argc != 4) {
    fprintf(stderr, "Usage: %s username passwd ip\n", argv[0]);
    return 1;
  }

  f = fopen(dst,"a");
  if (f!=NULL) {
    fprintf(f, "%s\tl2tpd\t%s\t%s\n", argv[1], argv[2], argv[3]);
    fclose(f);
  } else {
    fprintf(stderr, "Failed to open %s\n", dst);
    return 2;
  }
}
